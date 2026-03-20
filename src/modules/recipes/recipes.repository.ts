import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class RecipesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySpoonacularId(spoonacularId: number) {
    return this.prisma.db.recipe.findUnique({
      where: { spoonacularId },
      include: {
        ingredients: true,
        analyzedInstructions: {
          include: {
            steps: {
              include: {
                ingredients: true,
                equipment: true,
              },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });
  }

  async upsert(data: any) {
    const { ingredients, analyzedInstructions, ...recipeData } = data;

    return this.prisma.db.recipe.upsert({
      where: { spoonacularId: recipeData.spoonacularId },
      update: {
        ...recipeData,
        lastSyncedAt: new Date(),
        ingredients: {
          deleteMany: {},
          createMany: { data: ingredients },
        },
        analyzedInstructions: {
          deleteMany: {},
          create: analyzedInstructions.map((inst: any) => ({
            name: inst.name,
            steps: {
              create: inst.steps.map((s: any) => ({
                number: s.number,
                step: s.step,
                ingredients: {
                  create: s.ingredients,
                },
                equipment: {
                  create: s.equipment,
                },
              })),
            },
          })),
        },
      },
      create: {
        ...recipeData,
        ingredients: {
          createMany: { data: ingredients },
        },
        analyzedInstructions: {
          create: analyzedInstructions.map((inst: any) => ({
            name: inst.name,
            steps: {
              create: inst.steps.map((s: any) => ({
                number: s.number,
                step: s.step,
                ingredients: {
                  create: s.ingredients,
                },
                equipment: {
                  create: s.equipment,
                },
              })),
            },
          })),
        },
      },
      include: {
        ingredients: true,
        analyzedInstructions: {
          include: {
            steps: {
              include: {
                ingredients: true,
                equipment: true,
              },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });
  }

  /** Upsert minimal recipe data — used when adding a meal plan entry */
  async upsertBasic(data: {
    spoonacularId: number;
    title: string;
    image?: string | null;
    readyInMinutes?: number | null;
    servings?: number | null;
    calories?: number | null;
    protein?: number | null;
    fat?: number | null;
    carbs?: number | null;
  }) {
    return this.prisma.db.recipe.upsert({
      where: { spoonacularId: data.spoonacularId },
      update: {
        // Only overwrite nutrition if we have a non-null value
        ...(data.calories != null && { calories: data.calories }),
        ...(data.protein != null && { protein: data.protein }),
        ...(data.fat != null && { fat: data.fat }),
        ...(data.carbs != null && { carbs: data.carbs }),
      },
      create: {
        spoonacularId: data.spoonacularId,
        title: data.title,
        image: data.image,
        readyInMinutes: data.readyInMinutes,
        servings: data.servings,
        calories: data.calories,
        protein: data.protein,
        fat: data.fat,
        carbs: data.carbs,
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        veryHealthy: false,
        cheap: false,
        veryPopular: false,
        sustainable: false,
        lowFodmap: false,
        cuisines: [],
        diets: [],
        dishTypes: [],
        occasions: [],
        // Force full sync on next getDetail() call
        lastSyncedAt: new Date(0),
      },
      select: { id: true, spoonacularId: true, calories: true, protein: true, fat: true, carbs: true },
    });
  }

  isExpired(lastSyncedAt: Date, days = 7): boolean {
    const diff = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60 * 24);
    return diff > days;
  }
}
