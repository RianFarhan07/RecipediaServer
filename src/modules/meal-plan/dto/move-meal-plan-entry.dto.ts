import { IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MealSlotDto } from './create-meal-plan-entry.dto';

export class MoveMealPlanEntryDto {
  @ApiProperty()
  @IsString()
  entryId: string;

  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  toDate: string;

  @ApiProperty({ enum: MealSlotDto })
  @IsEnum(MealSlotDto)
  toMealType: MealSlotDto;
}
