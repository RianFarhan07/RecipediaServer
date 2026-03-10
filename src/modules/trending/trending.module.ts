import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { TrendingService } from './trending.service';
import { TrendingController } from './trending.controller';
import { TrendingRepository } from './trending.repository';
import { RecipesRepository } from '../recipes/recipes.repository';

@Module({
  imports: [RecipesModule],
  controllers: [TrendingController],
  providers: [TrendingService, TrendingRepository, RecipesRepository],
})
export class TrendingModule {}
