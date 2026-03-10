import { Injectable } from '@nestjs/common';
import { FridgeRepository } from './fridge.repository';
import { UpsertFridgeDto } from './dto/upsert-fridge.dto';
import { ALL_ITEMS, DEFAULT_FRIDGE_ITEMS } from './fridge.constants';

@Injectable()
export class FridgeService {
  constructor(private readonly fridgeRepository: FridgeRepository) {}

  async getFridge(userId: string) {
    const fridge = await this.fridgeRepository.findByUserId(userId);

    if (!fridge) {
      // User baru — seed dengan default
      const seeded = await this.fridgeRepository.upsert(
        userId,
        DEFAULT_FRIDGE_ITEMS,
        ALL_ITEMS, // semua jadi customItems = master list per user
      );
      return {
        items: (seeded.items as object[]) ?? [],
        customItems: (seeded.customItems as object[]) ?? [],
      };
    }

    return {
      items: (fridge.items as object[]) ?? [],
      customItems: (fridge.customItems as object[]) ?? [],
    };
  }

  async upsertFridge(userId: string, dto: UpsertFridgeDto) {
    await this.fridgeRepository.upsert(userId, dto.items, dto.customItems);
    return { items: dto.items, customItems: dto.customItems };
  }
}
