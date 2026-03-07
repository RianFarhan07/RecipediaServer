import { Injectable } from '@nestjs/common';
import { FridgeRepository } from './fridge.repository';
import { UpsertFridgeDto } from './dto/upsert-fridge.dto';

@Injectable()
export class FridgeService {
  constructor(private readonly fridgeRepository: FridgeRepository) {}

  async getFridge(userId: string) {
    const fridge = await this.fridgeRepository.findByUserId(userId);
    return {
      items: (fridge?.items as object[]) ?? [],
      customItems: (fridge?.customItems as object[]) ?? [],
    };
  }

  async upsertFridge(userId: string, dto: UpsertFridgeDto) {
    await this.fridgeRepository.upsert(userId, dto.items, dto.customItems);
    return { items: dto.items, customItems: dto.customItems };
  }
}
