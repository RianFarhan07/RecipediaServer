import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchRecipesDto } from './dto/search-recipes.dto';
import { extractNutritionFromSummary } from './nutrition.utils';

@Injectable()
export class SpoonacularService {
  private readonly logger = new Logger(SpoonacularService.name);
  private readonly baseUrl: string;
  private readonly apiKeys: string[];
  private currentKeyIndex = 0;

  // Track keys exhausted today — reset automatically at midnight
  private exhaustedIndices = new Set<number>();
  private exhaustedDate = '';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('spoonacular.baseUrl') ?? '';
    this.apiKeys = this.configService.get<string[]>('spoonacular.apiKeys') ?? [];
    if (this.apiKeys.length === 0) {
      const single = this.configService.get<string>('spoonacular.apiKey') ?? '';
      if (single) this.apiKeys.push(single);
    }
    this.logger.log(`Loaded ${this.apiKeys.length} Spoonacular API key(s)`);
  }

  private get apiKey(): string {
    return this.apiKeys[this.currentKeyIndex] ?? '';
  }

  /** Reset exhausted-key tracking if the date has rolled over. */
  private checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.exhaustedDate !== today) {
      this.exhaustedIndices.clear();
      this.exhaustedDate = today;
      if (this.exhaustedIndices.size === 0 && this.exhaustedDate) {
        this.logger.log('New day — Spoonacular quota counters reset');
      }
    }
  }

  /**
   * Mark current key as exhausted and rotate to the next fresh key.
   * Returns false if ALL keys are exhausted for today.
   */
  private rotateToFreshKey(): boolean {
    this.checkDailyReset();
    this.exhaustedIndices.add(this.currentKeyIndex);

    for (let i = 1; i <= this.apiKeys.length; i++) {
      const candidate = (this.currentKeyIndex + i) % this.apiKeys.length;
      if (!this.exhaustedIndices.has(candidate)) {
        this.logger.warn(
          `Spoonacular key #${this.currentKeyIndex + 1} quota exceeded — rotating to key #${candidate + 1}`,
        );
        this.currentKeyIndex = candidate;
        return true;
      }
    }

    this.logger.error(
      `All ${this.apiKeys.length} Spoonacular key(s) quota exceeded for today`,
    );
    return false;
  }

  private async callWithKeyRotation<T>(
    fn: (apiKey: string) => Promise<T>,
  ): Promise<T> {
    this.checkDailyReset();

    // If every key is already exhausted, fail fast — no point retrying
    if (this.exhaustedIndices.size >= this.apiKeys.length) {
      this.handleSpoonacularError({ status: 402 });
    }

    let lastError: unknown;

    // Try each fresh key at most once
    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        return await fn(this.apiKey);
      } catch (error: unknown) {
        lastError = error;
        const err = error as Record<string, unknown>;
        const response = err?.['response'] as
          | Record<string, unknown>
          | undefined;
        const status = (response?.['status'] ?? err?.['status']) as
          | number
          | undefined;
        if (status === 402 || status === 429) {
          if (!this.rotateToFreshKey()) break; // all keys exhausted
          continue;
        }
        break; // non-quota error — stop immediately
      }
    }

    this.handleSpoonacularError(lastError);
    throw lastError; // unreachable — handleSpoonacularError always throws
  }

  async searchRecipes(params: SearchRecipesDto) {
    return this.callWithKeyRotation(async (apiKey) => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey,
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
    });
  }

  async getRecipeDetail(spoonacularId: number) {
    return this.callWithKeyRotation(async (apiKey) => {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/recipes/${spoonacularId}/information`,
          { params: { apiKey, includeNutrition: false } },
        ),
      );
      return this.transformRecipeDetail(response.data);
    });
  }

  async getRandomRecipes(number = 12, tags?: string): Promise<unknown[]> {
    return this.callWithKeyRotation(async (apiKey) => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/random`, {
          params: { apiKey, number, tags, includeNutrition: true },
        }),
      );
      const data = response.data as { recipes: unknown[] };
      return data.recipes.map((r) => this.toCardShape(r));
    });
  }

  async findByIngredients(
    ingredients: string,
    number = 12,
  ): Promise<unknown[]> {
    return this.callWithKeyRotation(async (apiKey) => {
      // Step 1: get list of recipes matching ingredients
      const listResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/findByIngredients`, {
          params: {
            apiKey,
            ingredients,
            number,
            ranking: 1,
            ignorePantry: true,
          },
        }),
      );
      const list = listResponse.data as unknown[];
      if (!list.length) return [];

      // Step 2: bulk enrich to get full info
      const ids = list.map((r) => (r as { id: number }).id).join(',');
      const bulkResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/informationBulk`, {
          params: { apiKey, ids, includeNutrition: true },
        }),
      );

      // Step 3: transform to unified card shape
      return (bulkResponse.data as unknown[]).map((r) => this.toCardShape(r));
    });
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
    return this.callWithKeyRotation(async (apiKey) => {
      const lower = category.toLowerCase();
      const isValidType = this.VALID_DISH_TYPES.has(lower);

      const baseParams: Record<string, string | number | boolean> = {
        apiKey,
        number,
        offset,
        addRecipeInformation: true,
        addRecipeNutrition: true,
        fillIngredients: true,
        sort: 'popularity',
      };

      if (isValidType) {
        baseParams['type'] = category;
      } else if (this.CATEGORY_PARAM_MAP[lower]) {
        Object.assign(baseParams, this.CATEGORY_PARAM_MAP[lower]);
      } else {
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
    });
  }

  async getPopularRecipes(number = 8, offset = 0): Promise<unknown[]> {
    return this.callWithKeyRotation(async (apiKey) => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey,
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
      return (response.data as { results: unknown[] }).results.map((r) =>
        this.toCardShape(r),
      );
    });
  }

  async searchByNutrients(params: Record<string, unknown>) {
    return this.callWithKeyRotation(async (apiKey) => {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: { apiKey, addRecipeInformation: true, ...params },
        }),
      );
      return this.transformSearchResult(response.data);
    });
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
