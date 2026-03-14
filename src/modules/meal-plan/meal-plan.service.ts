import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MealSlot } from '@prisma/client';
import { MealPlanRepository } from './meal-plan.repository';
import { CreateMealPlanEntryDto } from './dto/create-meal-plan-entry.dto';
import { UpdateMealPlanEntryDto } from './dto/update-meal-plan-entry.dto';
import { MoveMealPlanEntryDto } from './dto/move-meal-plan-entry.dto';

@Injectable()
export class MealPlanService {
  constructor(private readonly repo: MealPlanRepository) {}

  async getByRange(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    return this.repo.findByRange(userId, start, end);
  }

  async addEntry(userId: string, dto: CreateMealPlanEntryDto) {
    const date = new Date(dto.date + 'T00:00:00.000Z');
    return this.repo.create(userId, {
      date,
      mealType: dto.mealType as MealSlot,
      spoonacularId: dto.spoonacularId,
      recipeTitle: dto.recipeTitle,
      recipeImage: dto.recipeImage,
      readyInMinutes: dto.readyInMinutes,
      servings: dto.servings,
    });
  }

  async updateEntry(userId: string, id: string, dto: UpdateMealPlanEntryDto) {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException('Meal plan entry not found');
    if (entry.userId !== userId) throw new ForbiddenException();
    return this.repo.update(id, dto);
  }

  async moveEntry(userId: string, dto: MoveMealPlanEntryDto) {
    const entry = await this.repo.findById(dto.entryId);
    if (!entry) throw new NotFoundException('Meal plan entry not found');
    if (entry.userId !== userId) throw new ForbiddenException();
    const toDate = new Date(dto.toDate + 'T00:00:00.000Z');
    return this.repo.move(dto.entryId, toDate, dto.toMealType as MealSlot);
  }

  async deleteEntry(userId: string, id: string) {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException('Meal plan entry not found');
    if (entry.userId !== userId) throw new ForbiddenException();
    return this.repo.delete(id);
  }
}
