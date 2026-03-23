import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SpoonacularService } from './spoonacular.service';
import { RecipesRepository } from './recipes.repository';
import { CategorySnapshotRepository } from './category-snapshot.repository';
import { SearchRecipesDto } from './dto/search-recipes.dto';
import { extractNutritionFromSummary } from './nutrition.utils';

const MEAL_SUGGESTION_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

@Injectable()
export class RecipesService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly spoonacular: SpoonacularService,
    private readonly repository: RecipesRepository,
    private readonly categorySnapshot: CategorySnapshotRepository,
  ) {}

  async search(dto: SearchRecipesDto) {
    return this.spoonacular.searchRecipes(dto);
  }

  async getRandom(number = 12, tags?: string) {
    return this.spoonacular.getRandomRecipes(number, tags);
  }

  async findByIngredients(ingredients: string, number = 12) {
    return this.spoonacular.findByIngredients(ingredients, number);
  }

  async getByCategory(category: string, number = 12, offset = 0) {
    const normalizedCategory = category.toLowerCase().trim();
    const normalizedOffset = Math.floor(offset);

    // 1. Cek cache DB dulu
    const cached = await this.categorySnapshot.find(
      normalizedCategory,
      normalizedOffset,
    );
    if (cached) {
      return cached.recipes;
    }

    // 2. Tidak ada cache / expired → fetch dari Spoonacular
    const result = await this.spoonacular.getByCategory(
      normalizedCategory,
      number,
      normalizedOffset,
    );

    // 3. Simpan ke DB (fire and forget — tidak await agar response cepat)
    if (result && Array.isArray((result as any).results)) {
      this.categorySnapshot
        .save(
          normalizedCategory,
          normalizedOffset,
          (result as any).results as object[],
        )
        .catch(() => {});
    }

    return result;
  }

  async getDetail(spoonacularId: number) {
    const existing = await this.repository.findBySpoonacularId(spoonacularId);
    if (existing && !this.repository.isExpired(existing.lastSyncedAt)) {
      return { ...existing, source: 'db' };
    }
    const fresh = await this.spoonacular.getRecipeDetail(spoonacularId);
    const nutrition = extractNutritionFromSummary(
      (fresh as any).summary as string | null | undefined,
    );
    const freshWithNutrition = { ...fresh, ...nutrition };
    const saved = await this.repository.upsert(freshWithNutrition);
    return { ...saved, source: 'spoonacular' };
  }

  async getMealSuggestions(params: {
    mealType: string;
    minCalories?: number;
    maxCalories?: number;
    offset?: number;
  }) {
    // Round calories to nearest 50 → more cache hits for similar profiles
    const minCal = params.minCalories
      ? Math.round(params.minCalories / 50) * 50
      : 0;
    const maxCal = params.maxCalories
      ? Math.round(params.maxCalories / 50) * 50
      : 9999;
    const offset = params.offset ?? 0;
    const cacheKey = `meal-suggestions:${params.mealType}:${minCal}:${maxCal}:${offset}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const mealTypeMap: Record<string, string> = {
      breakfast: 'breakfast',
      lunch: 'main course,salad,soup',
      dinner: 'main course',
    };
    const result = await this.spoonacular.searchByNutrients({
      type: mealTypeMap[params.mealType] ?? 'main course',
      minCalories: params.minCalories,
      maxCalories: params.maxCalories,
      number: 6,
      offset,
      sort: 'random',
      addRecipeNutrition: true,
      fillIngredients: false,
    });

    await this.cache.set(cacheKey, result, MEAL_SUGGESTION_TTL);
    return result;
  }

  async upsertBasic(data: {
    spoonacularId: number;
    title: string;
    image?: string | null;
    readyInMinutes?: number | null;
    servings?: number | null;
    calories?: number | null;
    protein?: number | null;
    fat?: number | null;
    carbs?: number | null;
  }) {
    return this.repository.upsertBasic(data);
  }

  // Dipanggil oleh cron — bersihkan expired snapshots
  async cleanExpiredCategorySnapshots() {
    return this.categorySnapshot.deleteExpired();
  }
}
