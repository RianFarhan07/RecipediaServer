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

  isExpired(lastSyncedAt: Date, days = 7): boolean {
    const diff = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60 * 24);
    return diff > days;
  }
}
