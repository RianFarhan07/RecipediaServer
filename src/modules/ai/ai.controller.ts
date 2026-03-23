import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiService } from './ai.service';
import { FindByDescriptionDto } from './dto/find-by-description.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.deconator';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('generate-by-nutrients')
  @ApiOperation({ summary: 'Generate recipes based on user BMI & nutrition' })
  generateByNutrients(@CurrentUser() user: any) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.aiService.generateByNutrients(user);
  }

  @Get('ingredient-recommendations')
  @ApiOperation({ summary: 'Get ingredient recommendations based on profile' })
  ingredientRecommendations(@CurrentUser() user: any) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.aiService.ingredientRecommendations(user);
  }

  @Get('find-by-description')
  @ApiOperation({ summary: 'Find recipes by natural language description' })
  findByDescription(@Query() dto: FindByDescriptionDto) {
    return this.aiService.findByDescription(dto.description);
  }

  @Get('ingredient-emoji')
  @ApiOperation({ summary: 'Get emoji for a given ingredient name' })
  @ApiQuery({ name: 'ingredient', required: true, type: String })
  getIngredientEmoji(@Query('ingredient') ingredient: string) {
    return this.aiService.getIngredientEmoji(ingredient);
  }

  @Post('identify-dish')
  @ApiOperation({ summary: 'Identify dish from food image and find recipes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  identifyDish(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.identifyDish(file);
  }

  @Post('analyze-image')
  @ApiOperation({ summary: 'Analyze food image to detect ingredients' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  analyzeImage(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.analyzeImage(file);
  }

  @Get('generate-by-nutrients-meal-type')
  @ApiOperation({
    summary: 'Generate recipes for specific meal type based on user profile',
  })
  @ApiQuery({
    name: 'mealType',
    required: true,
    enum: ['breakfast', 'lunch', 'dinner'],
  })
  generateByNutrientsMealType(
    @CurrentUser() user: any,
    @Query('mealType') mealType: string,
  ) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.aiService.generateByNutrientsMealType(user, mealType);
  }
}
