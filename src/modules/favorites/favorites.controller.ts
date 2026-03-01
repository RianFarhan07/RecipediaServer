import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.deconator';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorites' })
  getFavorites(@CurrentUser() user: any) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.favoritesService.getFavorites(user.id);
  }

  @Post(':spoonacularId')
  @ApiOperation({ summary: 'Add recipe to favorites' })
  @ApiParam({ name: 'spoonacularId', type: Number })
  addFavorite(
    @CurrentUser() user: any,
    @Param('spoonacularId', ParseIntPipe) spoonacularId: number,
  ) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.favoritesService.addFavorite(user.id, spoonacularId);
  }

  @Delete(':spoonacularId')
  @ApiOperation({ summary: 'Remove recipe from favorites' })
  @ApiParam({ name: 'spoonacularId', type: Number })
  removeFavorite(
    @CurrentUser() user: any,
    @Param('spoonacularId', ParseIntPipe) spoonacularId: number,
  ) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.favoritesService.removeFavorite(user.id, spoonacularId);
  }

  @Get('check/:spoonacularId')
  @ApiOperation({ summary: 'Check if recipe is favorited' })
  @ApiParam({ name: 'spoonacularId', type: Number })
  checkIsFavorited(
    @CurrentUser() user: any,
    @Param('spoonacularId', ParseIntPipe) spoonacularId: number,
  ) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.favoritesService.checkIsFavorited(user.id, spoonacularId);
  }
}
