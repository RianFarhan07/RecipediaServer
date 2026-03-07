import { IsArray } from 'class-validator';

export class UpsertFridgeDto {
  @IsArray()
  items: object[];

  @IsArray()
  customItems: object[];
}
