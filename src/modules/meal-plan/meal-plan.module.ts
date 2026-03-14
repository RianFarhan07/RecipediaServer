import { Module } from '@nestjs/common';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { MealPlanRepository } from './meal-plan.repository';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [RecipesModule],
  controllers: [MealPlanController],
  providers: [MealPlanService, MealPlanRepository],
})
export class MealPlanModule {}
