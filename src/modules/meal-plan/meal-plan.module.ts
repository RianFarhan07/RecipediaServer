import { Module } from '@nestjs/common';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { MealPlanRepository } from './meal-plan.repository';

@Module({
  controllers: [MealPlanController],
  providers: [MealPlanService, MealPlanRepository],
})
export class MealPlanModule {}
