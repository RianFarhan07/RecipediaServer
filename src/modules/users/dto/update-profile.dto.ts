import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  male = 'male',
  female = 'female',
}

export enum ActivityLevel {
  low = 'low',
  light = 'light',
  moderate = 'moderate',
  high = 'high',
  very_high = 'very_high',
}

export enum DietType {
  gluten_free = 'gluten_free',
  ketogenic = 'ketogenic',
  vegetarian = 'vegetarian',
  lacto_vegetarian = 'lacto_vegetarian',
  ovo_vegetarian = 'ovo_vegetarian',
  vegan = 'vegan',
  pescetarian = 'pescetarian',
  paleo = 'paleo',
  primal = 'primal',
  low_fodmap = 'low_fodmap',
  whole30 = 'whole30',
}

export const ALLOWED_ALLERGIES = [
  'dairy',
  'egg',
  'gluten',
  'grain',
  'peanut',
  'seafood',
  'sesame',
  'shellfish',
  'soy',
  'sulfite',
  'tree nut',
  'wheat',
];

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  height?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  age?: number;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ enum: ActivityLevel, required: false })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @ApiProperty({ enum: DietType, required: false })
  @IsOptional()
  @IsEnum(DietType)
  diet?: DietType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];
}
