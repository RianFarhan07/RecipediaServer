import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchRecipesDto } from './dto/search-recipes.dto';

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
          },
        }),
      );
      return response.data.recipes.map((r: any) =>
        this.transformRecipeDetail(r),
      );
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async findByIngredients(ingredients: string, number = 12) {
    try {
      const response = await firstValueFrom(
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
      return response.data;
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async getByCategory(category: string, number = 12) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: {
            apiKey: this.apiKey,
            type: category,
            number,
            addRecipeInformation: true,
          },
        }),
      );
      return this.transformSearchResult(response.data);
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  async searchByNutrients(params: Record<string, any>) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recipes/complexSearch`, {
          params: { apiKey: this.apiKey, ...params },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleSpoonacularError(error);
    }
  }

  // Transform search result
  private transformSearchResult(data: any) {
    return {
      results: data.results.map((r: any) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        imageType: r.imageType,
        readyInMinutes: r.readyInMinutes,
        servings: r.servings,
        cuisines: r.cuisines ?? [],
        diets: r.diets ?? [],
        dishTypes: r.dishTypes ?? [],
        vegetarian: r.vegetarian,
        vegan: r.vegan,
        glutenFree: r.glutenFree,
        dairyFree: r.dairyFree,
        veryHealthy: r.veryHealthy,
        cheap: r.cheap,
        veryPopular: r.veryPopular,
        healthScore: r.healthScore,
        spoonacularScore: r.spoonacularScore,
      })),
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
