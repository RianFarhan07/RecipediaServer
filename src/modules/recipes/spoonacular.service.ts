import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchRecipesDto } from './dto/search-recipes.dto';
import { extractNutritionFromSummary } from './nutrition.utils';

@Injectable()
export class SpoonacularService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('spoonacular.baseUrl') ?? '';
    this.apiKey = this.configService.get<string>('spoonacular.apiKey') ?? '';
  }

  async searchRecipes(params: SearchRecipesDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey: this.apiKey,
            query: params.query,
            cuisine: params.cuisine,
            diet: params.diet,
            intolerances: params.intolerances,
            type: params.type,
            number: params.number ?? 12,
            offset: params.offset ?? 0,
            addRecipeInformation: true,
            addRecipeNutrition: true,
            fillIngredients: true,
            instructionsRequired: true,
          },
        }),
      );
      return this.transformSearchResult(response.data);
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async getRecipeDetail(spoonacularId: number) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/recipes/${spoonacularId}/information`,
          {
            params: {
              apiKey: this.apiKey,
              includeNutrition: false,
            },
          },
        ),
      );
      return this.transformRecipeDetail(response.data);
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async getRandomRecipes(number = 12, tags?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/random`, {
          params: {
            apiKey: this.apiKey,
            number,
            tags,
            includeNutrition: true,
          },
        }),
      );
      return response.data.recipes.map((r: any) => this.toCardShape(r));
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async findByIngredients(ingredients: string, number = 12) {
    try {
      // Step 1: get list of recipes matching ingredients
      const listResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/findByIngredients`, {
          params: {
            apiKey: this.apiKey,
            ingredients,
            number,
            ranking: 1,
            ignorePantry: true,
          },
        }),
      );
      const list: any[] = listResponse.data;
      if (!list.length) return [];

      // Step 2: bulk enrich to get full info (extendedIngredients, scores, etc.)
      const ids = list.map((r: any) => r.id).join(',');
      const bulkResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/informationBulk`, {
          params: { apiKey: this.apiKey, ids, includeNutrition: true },
        }),
      );

      // Step 3: transform to unified card shape
      return bulkResponse.data.map((r: any) => this.toCardShape(r));
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  private readonly VALID_DISH_TYPES = new Set<string>([
    'main course',
    'side dish',
    'dessert',
    'appetizer',
    'salad',
    'bread',
    'breakfast',
    'soup',
    'beverage',
    'sauce',
    'marinade',
    'fingerfood',
    'snack',
    'drink',
  ]);

  // Mapping kategori custom → param Spoonacular yang tepat
  private readonly CATEGORY_PARAM_MAP: Record<string, Record<string, string>> =
    {
      seafood: { query: 'seafood' },
      pasta: { query: 'pasta' },
      noodles: { query: 'noodles' },
      rice: { query: 'rice dish' },
      grill: { query: 'grilled' },
      vegetarian: { query: 'vegetarian', diet: 'vegetarian' },
      vegan: { query: 'vegan', diet: 'vegan' },
      baking: { query: 'baking' },
      'stir fry': { query: 'stir fry' },
      sandwich: { query: 'sandwich' },
      smoothie: { query: 'smoothie' },
      wrap: { query: 'wrap' },
    };

  async getByCategory(category: string, number = 12, offset = 0) {
    try {
      const lower = category.toLowerCase();
      const isValidType = this.VALID_DISH_TYPES.has(lower);

      const baseParams: Record<string, string | number | boolean> = {
        apiKey: this.apiKey,
        number,
        offset,
        addRecipeInformation: true,
        addRecipeNutrition: true,
        fillIngredients: true,
        sort: 'popularity',
      };

      if (isValidType) {
        // Valid dish type → pakai type param langsung
        baseParams['type'] = category;
      } else if (this.CATEGORY_PARAM_MAP[lower]) {
        // Custom mapping → merge param yang sesuai
        const customParams = this.CATEGORY_PARAM_MAP[lower];
        Object.assign(baseParams, customParams);
      } else {
        // Fallback → query biasa
        baseParams['query'] = category;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: baseParams,
        }),
      );
      return this.transformSearchResult(
        response.data as Record<string, unknown>,
      );
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async getPopularRecipes(number = 8, offset = 0) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey: this.apiKey,
            number,
            offset,
            sort: 'popularity',
            sortDirection: 'desc',
            addRecipeInformation: true,
            addRecipeNutrition: true,
            fillIngredients: true,
          },
        }),
      );
      return response.data.results.map((r: any) => this.toCardShape(r));
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async searchByNutrients(params: Record<string, any>) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey: this.apiKey,
            addRecipeInformation: true,
            ...params,
          },
        }),
      );
      return this.transformSearchResult(response.data);
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  // Unified card shape — dipakai oleh semua list endpoint
  private toCardShape(r: any) {
    // Try structured nutrition data first (available when addRecipeNutrition: true),
    // then fall back to parsing the HTML summary string.
    const raw = r as {
      nutrition?: { nutrients?: Array<{ name: string; amount: number }> };
      summary?: string | null;
    };
    const nutrients = raw.nutrition?.nutrients ?? [];
    const fromNutrients = (name: string): number | null => {
      const n = nutrients.find((x) => x.name === name);
      return n ? Math.round(n.amount) : null;
    };
    const fromSummary = extractNutritionFromSummary(raw.summary);

    return {
      id: r.id,
      title: r.title,
      image: r.image ?? null,
      readyInMinutes: r.readyInMinutes ?? null,
      servings: r.servings ?? null,
      calories: fromNutrients('Calories') ?? fromSummary.calories,
      protein: fromNutrients('Protein') ?? fromSummary.protein,
      fat: fromNutrients('Fat') ?? fromSummary.fat,
      carbs: fromNutrients('Carbohydrates') ?? fromSummary.carbs,
      healthScore: r.healthScore ?? null,
      spoonacularScore: r.spoonacularScore ?? null,
      cuisines: r.cuisines ?? [],
      diets: r.diets ?? [],
      dishTypes: r.dishTypes ?? [],
      vegetarian: r.vegetarian ?? false,
      vegan: r.vegan ?? false,
      glutenFree: r.glutenFree ?? false,
      dairyFree: r.dairyFree ?? false,
      veryPopular: r.veryPopular ?? false,
      ingredients: (r.extendedIngredients ?? []).map((i: any) => ({
        id: i.id,
        name: i.nameClean ?? i.name,
        image: i.image
          ? `https://spoonacular.com/cdn/ingredients_100x100/${i.image}`
          : null,
      })),
    };
  }

  // Transform search result
  private transformSearchResult(data: any) {
    return {
      results: data.results.map((r: any) => this.toCardShape(r)),
      totalResults: data.totalResults,
      offset: data.offset,
      number: data.number,
    };
  }

  // Transform recipe detail — full data untuk disimpan ke DB
  transformRecipeDetail(r: any) {
    return {
      spoonacularId: r.id,
      title: r.title,
      image: r.image,
      imageType: r.imageType,
      servings: r.servings,
      readyInMinutes: r.readyInMinutes,
      cookingMinutes: r.cookingMinutes,
      preparationMinutes: r.preparationMinutes,
      healthScore: r.healthScore,
      spoonacularScore: r.spoonacularScore,
      pricePerServing: r.pricePerServing,
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
      spoonacularSourceUrl: r.spoonacularSourceUrl,
      license: r.license,
      summary: r.summary,
      instructions: r.instructions,
      vegetarian: r.vegetarian ?? false,
      vegan: r.vegan ?? false,
      glutenFree: r.glutenFree ?? false,
      dairyFree: r.dairyFree ?? false,
      veryHealthy: r.veryHealthy ?? false,
      cheap: r.cheap ?? false,
      veryPopular: r.veryPopular ?? false,
      sustainable: r.sustainable ?? false,
      lowFodmap: r.lowFodmap ?? false,
      weightWatcherSmartPoints: r.weightWatcherSmartPoints,
      cuisines: r.cuisines ?? [],
      diets: r.diets ?? [],
      dishTypes: r.dishTypes ?? [],
      occasions: r.occasions ?? [],
      ingredients: (r.extendedIngredients ?? []).map((i: any) => ({
        spoonId: i.id,
        name: i.name,
        nameClean: i.nameClean,
        original: i.original,
        originalName: i.originalName,
        amount: i.amount,
        unit: i.unit,
        image: i.image
          ? `https://spoonacular.com/cdn/ingredients_100x100/${i.image}`
          : null,
        aisle: i.aisle,
        consistency: i.consistency,
        meta: i.meta ?? [],
      })),
      analyzedInstructions: (r.analyzedInstructions ?? []).map((inst: any) => ({
        name: inst.name,
        steps: (inst.steps ?? []).map((s: any) => ({
          number: s.number,
          step: s.step,
          ingredients: (s.ingredients ?? []).map((si: any) => ({
            spoonId: si.id,
            name: si.name,
            image: si.image,
          })),
          equipment: (s.equipment ?? []).map((eq: any) => ({
            spoonId: eq.id,
            name: eq.name,
            image: eq.image,
          })),
        })),
      })),
    };
  }

  private handleSpoonacularError(error: any) {
    if (error?.response?.status === 402) {
      throw new HttpException(
        'Spoonacular API quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error?.response?.status === 404) {
      throw new HttpException('Recipe not found', HttpStatus.NOT_FOUND);
    }
    throw new HttpException('External API error', HttpStatus.BAD_GATEWAY);
  }
}
