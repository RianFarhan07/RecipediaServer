import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesRepository } from './favorites.repository';
import { RecipesModule } from '../recipes/recipes.module';
import { FavoritesController } from './favorites.controller';

@Module({
  imports: [RecipesModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesRepository],
})
export class FavoritesModule {}
