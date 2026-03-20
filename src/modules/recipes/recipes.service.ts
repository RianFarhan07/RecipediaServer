import { Injectable } from '@nestjs/common';
import { SpoonacularService } from './spoonacular.service';
import { RecipesRepository } from './recipes.repository';
import { SearchRecipesDto } from './dto/search-recipes.dto';
import { extractNutritionFromSummary } from './nutrition.utils';

@Injectable()
export class RecipesService {
  constructor(
    private readonly spoonacular: SpoonacularService,
    private readonly repository: RecipesRepository,
  ) {}

  // Search — selalu dari Spoonacular
  async search(dto: SearchRecipesDto) {
    return this.spoonacular.searchRecipes(dto);
  }

  // Random — selalu dari Spoonacular
  async getRandom(number = 12, tags?: string) {
    return this.spoonacular.getRandomRecipes(number, tags);
  }

  // Find by ingredients — selalu dari Spoonacular
  async findByIngredients(ingredients: string, number = 12) {
    return this.spoonacular.findByIngredients(ingredients, number);
  }

  // By category — selalu dari Spoonacular
  async getByCategory(category: string, number = 12) {
    return this.spoonacular.getByCategory(category, number);
  }

  // Detail — DB first, fallback Spoonacular (OPSI A)
  async getDetail(spoonacularId: number) {
    // 1. Cek DB
    const existing = await this.repository.findBySpoonacularId(spoonacularId);

    // 2. Ada & fresh → return dari DB
    if (existing && !this.repository.isExpired(existing.lastSyncedAt)) {
      return { ...existing, source: 'db' };
    }

    // 3. Tidak ada / expired → hit Spoonacular
    const fresh = await this.spoonacular.getRecipeDetail(spoonacularId);

    // 4. Extract nutrition from summary before saving
    const nutrition = extractNutritionFromSummary(
      (fresh as any).summary as string | null | undefined,
    );
    const freshWithNutrition = { ...fresh, ...nutrition };

    // 5. Simpan/update ke DB
    const saved = await this.repository.upsert(freshWithNutrition);

    return { ...saved, source: 'spoonacular' };
  }

  /** Upsert minimal recipe for meal-plan linking */
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
}
