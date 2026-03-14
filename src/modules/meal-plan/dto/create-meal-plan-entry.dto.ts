import { IsString, IsInt, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MealSlotDto {
  breakfast = 'breakfast',
  lunch = 'lunch',
  dinner = 'dinner',
}

export class CreateMealPlanEntryDto {
  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MealSlotDto })
  @IsEnum(MealSlotDto)
  mealType: MealSlotDto;

  @ApiProperty({ example: 123456 })
  @IsInt()
  spoonacularId: number;

  @ApiProperty({ example: 'Avocado Toast' })
  @IsString()
  recipeTitle: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipeImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  readyInMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  servings?: number;
}
