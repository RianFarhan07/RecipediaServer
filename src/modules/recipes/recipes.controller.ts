import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { SearchRecipesDto } from './dto/search-recipes.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search recipes from Spoonacular' })
  search(@Query() dto: SearchRecipesDto) {
    return this.recipesService.search(dto);
  }

  @Get('random')
  @ApiOperation({ summary: 'Get random recipes' })
  @ApiQuery({ name: 'number', required: false, type: Number })
  @ApiQuery({ name: 'tags', required: false, type: String })
  getRandom(@Query('number') number?: number, @Query('tags') tags?: string) {
    return this.recipesService.getRandom(number, tags);
  }

  @Get('find-by-ingredients')
  @ApiOperation({ summary: 'Find recipes by ingredients' })
  @ApiQuery({ name: 'ingredients', required: true })
  @ApiQuery({ name: 'number', required: false, type: Number })
  findByIngredients(
    @Query('ingredients') ingredients: string,
    @Query('number') number?: number,
  ) {
    return this.recipesService.findByIngredients(ingredients, number);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get recipes by category (dish type)' })
  @ApiParam({ name: 'category', type: String })
  @ApiQuery({ name: 'number', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getByCategory(
    @Param('category') category: string,
    @Query('number', new ParseFloatPipe({ optional: true })) number?: number,
    @Query('offset', new ParseFloatPipe({ optional: true })) offset?: number,
  ) {
    return this.recipesService.getByCategory(category, number, offset);
  }

  @Get('meal-suggestions')
  @ApiOperation({
    summary: 'Get personalized meal suggestions by calorie range',
  })
  @ApiQuery({ name: 'mealType', required: true })
  @ApiQuery({ name: 'minCalories', required: false, type: Number })
  @ApiQuery({ name: 'maxCalories', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getMealSuggestions(
    @Query('mealType') mealType: string,
    @Query('minCalories', new ParseFloatPipe({ optional: true }))
    minCalories?: number,
    @Query('maxCalories', new ParseFloatPipe({ optional: true }))
    maxCalories?: number,
    @Query('offset', new ParseFloatPipe({ optional: true })) offset?: number,
  ) {
    return this.recipesService.getMealSuggestions({
      mealType,
      minCalories,
      maxCalories,
      offset,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get recipe detail (DB first, fallback Spoonacular)',
  })
  @ApiParam({ name: 'id', type: Number })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.recipesService.getDetail(id);
  }
}
