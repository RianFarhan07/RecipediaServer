import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { MealSlot } from '@prisma/client';

@Injectable()
export class MealPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRange(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.db.mealPlanEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        recipe: {
          select: { id: true, spoonacularId: true, calories: true, protein: true, fat: true, carbs: true },
        },
      },
      orderBy: [{ date: 'asc' }, { mealType: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.db.mealPlanEntry.findUnique({ where: { id } });
  }

  async create(
    userId: string,
    data: {
      date: Date;
      mealType: MealSlot;
      spoonacularId: number;
      recipeTitle: string;
      recipeImage?: string;
      readyInMinutes?: number;
      servings?: number;
      recipeId?: string;
    },
  ) {
    return this.prisma.db.mealPlanEntry.create({
      data: { userId, ...data },
    });
  }

  async update(id: string, data: { note?: string; makeDouble?: boolean }) {
    return this.prisma.db.mealPlanEntry.update({
      where: { id },
      data,
    });
  }

  async move(id: string, toDate: Date, toMealType: MealSlot) {
    return this.prisma.db.mealPlanEntry.update({
      where: { id },
      data: { date: toDate, mealType: toMealType },
    });
  }

  async delete(id: string) {
    return this.prisma.db.mealPlanEntry.delete({ where: { id } });
  }

  async deleteByUserAndDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.db.mealPlanEntry.deleteMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });
  }
}
