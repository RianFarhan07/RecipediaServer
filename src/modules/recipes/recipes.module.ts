import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipesRepository } from './recipes.repository';
import { SpoonacularService } from './spoonacular.service';

@Module({
  imports: [HttpModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipesRepository, SpoonacularService],
  exports: [RecipesService, SpoonacularService],
})
export class RecipesModule {}
