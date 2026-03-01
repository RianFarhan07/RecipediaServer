import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindByDescriptionDto {
  @ApiProperty({ example: 'Healthy Food Without Sugar' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
