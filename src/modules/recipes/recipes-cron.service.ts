import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CategorySnapshotRepository } from './category-snapshot.repository';

@Injectable()
export class RecipesCronService {
  private readonly logger = new Logger(RecipesCronService.name);

  constructor(private readonly categorySnapshot: CategorySnapshotRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredCategorySnapshots() {
    const count = await this.categorySnapshot.deleteExpired();
    this.logger.log(`Cleaned ${count} expired category snapshots.`);
  }
}
