import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MealSlot } from '@prisma/client';
import { MealPlanRepository } from './meal-plan.repository';
import { RecipesService } from '../recipes/recipes.service';
import { CreateMealPlanEntryDto } from './dto/create-meal-plan-entry.dto';
import { UpdateMealPlanEntryDto } from './dto/update-meal-plan-entry.dto';
import { MoveMealPlanEntryDto } from './dto/move-meal-plan-entry.dto';

@Injectable()
export class MealPlanService {
  constructor(
    private readonly repo: MealPlanRepository,
    private readonly recipesService: RecipesService,
  ) {}

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

  /** Aggregate ingredients from all meal plan entries in range, grouped by aisle/category */
  async getShoppingList(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    const entries = await this.repo.findByRange(userId, start, end);

    const uniqueIds = [...new Set(entries.map((e) => e.spoonacularId))];

    // Fetch recipe details in parallel (cached via RecipesService)
    const details = await Promise.allSettled(
      uniqueIds.map((id) => this.recipesService.getDetail(id)),
    );

    // Build ingredient map: nameClean → aggregated item
    type IngItem = {
      name: string;
      amount: number;
      unit: string;
      aisle: string;
      image: string | null;
      recipes: string[];
      original: string;
    };
    const ingredientMap = new Map<string, IngItem>();

    for (const result of details) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const recipe = result.value as any;
      const recipeTitle: string = recipe.title ?? '';

      for (const ing of recipe.ingredients ?? []) {
        const key = (ing.nameClean ?? ing.name ?? '').toLowerCase().trim();
        if (!key) continue;

        const existing = ingredientMap.get(key);
        if (existing) {
          // Add amount if same unit, otherwise just record recipe
          if (existing.unit === (ing.unit ?? '')) {
            existing.amount += ing.amount ?? 0;
          }
          if (!existing.recipes.includes(recipeTitle)) {
            existing.recipes.push(recipeTitle);
          }
        } else {
          ingredientMap.set(key, {
            name: ing.nameClean ?? ing.name ?? key,
            amount: ing.amount ?? 0,
            unit: ing.unit ?? '',
            aisle: ing.aisle ?? 'Other',
            image: ing.image ?? null,
            recipes: [recipeTitle],
            original: ing.original ?? '',
          });
        }
      }
    }

    // Group by aisle
    const grouped = new Map<string, IngItem[]>();
    for (const [, ing] of ingredientMap) {
      const aisle = ing.aisle || 'Other';
      if (!grouped.has(aisle)) grouped.set(aisle, []);
      grouped.get(aisle)!.push(ing);
    }

    return Array.from(grouped.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /** Copy meal plan entries from last week into target week (Mon–Sun, offset +7 days) */
  async copyLastWeek(userId: string, targetWeekStart: string) {
    const targetStart = new Date(targetWeekStart + 'T00:00:00.000Z');

    // Source: same weekday range but 7 days earlier
    const sourceStart = new Date(targetStart);
    sourceStart.setDate(sourceStart.getDate() - 7);
    const sourceEnd = new Date(targetStart);
    sourceEnd.setDate(sourceEnd.getDate() - 1);
    sourceEnd.setHours(23, 59, 59, 999);

    const sourceEntries = await this.repo.findByRange(userId, sourceStart, sourceEnd);
    if (sourceEntries.length === 0) return { copied: 0 };

    let copied = 0;
    for (const entry of sourceEntries) {
      const newDate = new Date(entry.date);
      newDate.setDate(newDate.getDate() + 7);
      await this.repo.create(userId, {
        date: newDate,
        mealType: entry.mealType,
        spoonacularId: entry.spoonacularId,
        recipeTitle: entry.recipeTitle,
        recipeImage: entry.recipeImage ?? undefined,
        readyInMinutes: entry.readyInMinutes ?? undefined,
        servings: entry.servings ?? undefined,
      });
      copied++;
    }

    return { copied };
  }
}
