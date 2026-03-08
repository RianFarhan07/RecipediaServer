import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { TrendingService } from './trending.service';
import { TrendingController } from './trending.controller';
import { TrendingRepository } from './trending.repository';

@Module({
  imports: [RecipesModule],
  controllers: [TrendingController],
  providers: [TrendingService, TrendingRepository],
})
export class TrendingModule {}
