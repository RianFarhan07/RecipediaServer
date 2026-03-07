import { Module } from '@nestjs/common';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { FridgeRepository } from './fridge.repository';

@Module({
  controllers: [FridgeController],
  providers: [FridgeService, FridgeRepository],
})
export class FridgeModule {}
