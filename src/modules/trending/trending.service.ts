import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SpoonacularService } from '../recipes/spoonacular.service';
import { TrendingRepository } from './trending.repository';

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    private readonly spoonacular: SpoonacularService,
    private readonly repository: TrendingRepository,
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
    const recipes = await this.spoonacular.getPopularRecipes(8);
    await this.repository.saveToday(recipes);
    this.logger.log('Trending recipes updated.');
    return recipes;
  }
}
