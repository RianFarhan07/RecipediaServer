import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { FavoritesRepository } from './favorites.repository';
import { RecipesService } from '../recipes/recipes.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly recipesService: RecipesService,
  ) {}

  async getFavorites(userId: string) {
    return this.favoritesRepository.findAllByUserId(userId);
  }

  async addFavorite(userId: string, spoonacularId: number) {
    // Pastikan recipe ada di DB (trigger sync kalau belum ada)
    const recipe = await this.recipesService.getDetail(spoonacularId);

    // Cek sudah difavorite belum
    const existing = await this.favoritesRepository.findOne(userId, recipe.id);
    if (existing) {
      throw new ConflictException('Recipe already in favorites');
    }

    return this.favoritesRepository.create(userId, recipe.id);
  }

  async removeFavorite(userId: string, spoonacularId: number) {
    // Cari recipe di DB
    const isFavorited = await this.favoritesRepository.isRecipeFavorited(
      userId,
      spoonacularId,
    );

    if (!isFavorited) {
      throw new NotFoundException('Recipe not in favorites');
    }

    // Ambil recipe id
    const recipe = await this.recipesService.getDetail(spoonacularId);
    return this.favoritesRepository.delete(userId, recipe.id);
  }

  async checkIsFavorited(userId: string, spoonacularId: number) {
    const isFavorited = await this.favoritesRepository.isRecipeFavorited(
      userId,
      spoonacularId,
    );
    return { isFavorited, spoonacularId };
  }
}
