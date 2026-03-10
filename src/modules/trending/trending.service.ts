import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpoonacularService } from '../recipes/spoonacular.service';
import { TrendingRepository } from './trending.repository';
import { RecipesRepository } from '../recipes/recipes.repository';

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    private readonly spoonacular: SpoonacularService,
    private readonly repository: TrendingRepository,
    private readonly recipesRepository: RecipesRepository,
  ) {}

  async getTrending() {
    const snapshot = await this.repository.findToday();
    if (snapshot) return snapshot.recipes;

    // Belum ada snapshot hari ini — refresh sekarang
    return this.refreshTrending();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshTrending() {
    this.logger.log('Refreshing trending recipes...');
    await this.repository.clearToday();

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );
    const offset = (dayOfYear % 25) * 8;

    const cards = await this.spoonacular.getPopularRecipes(8, offset);

    // Fetch full detail & simpan ke tabel Recipe
    await Promise.all(
      cards.map(async (card: any) => {
        const detail = await this.spoonacular.getRecipeDetail(card.id);
        await this.recipesRepository.upsert(detail);
      }),
    );

    await this.repository.saveToday(cards);
    this.logger.log(`Trending recipes updated (offset: ${offset}).`);
    return cards;
  }
}
