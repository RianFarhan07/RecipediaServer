import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: string) {
    return this.prisma.db.favorite.findMany({
      where: { userId },
      include: {
        recipe: {
          select: {
            id: true,
            spoonacularId: true,
            title: true,
            image: true,
            readyInMinutes: true,
            servings: true,
            cuisines: true,
            diets: true,
            vegetarian: true,
            vegan: true,
            glutenFree: true,
            healthScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, recipeId: string) {
    return this.prisma.db.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
  }

  async create(userId: string, recipeId: string) {
    return this.prisma.db.favorite.create({
      data: { userId, recipeId },
    });
  }

  async delete(userId: string, recipeId: string) {
    return this.prisma.db.favorite.delete({
      where: { userId_recipeId: { userId, recipeId } },
    });
  }

  async isRecipeFavorited(userId: string, spoonacularId: number) {
    const recipe = await this.prisma.db.recipe.findUnique({
      where: { spoonacularId },
      select: { id: true },
    });
    if (!recipe) return false;

    const fav = await this.findOne(userId, recipe.id);
    return !!fav;
  }
}
