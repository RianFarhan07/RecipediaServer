import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipesRepository } from './recipes.repository';
import { SpoonacularService } from './spoonacular.service';
import { CategorySnapshotRepository } from './category-snapshot.repository';
import { RecipesCronService } from './recipes-cron.service';

@Module({
  imports: [HttpModule],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    RecipesRepository,
    SpoonacularService,
    CategorySnapshotRepository,
    RecipesCronService,
  ],
  exports: [RecipesService, SpoonacularService, CategorySnapshotRepository],
})
export class RecipesModule {}
