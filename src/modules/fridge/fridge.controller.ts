import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FridgeService } from './fridge.service';
import { UpsertFridgeDto } from './dto/upsert-fridge.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.deconator';

@ApiTags('Fridge')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('fridge')
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  @Get()
  @ApiOperation({ summary: "Get current user's fridge" })
  getFridge(@CurrentUser() user: any) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.fridgeService.getFridge(user.id);
  }

  @Put()
  @ApiOperation({ summary: "Save current user's fridge" })
  upsertFridge(@CurrentUser() user: any, @Body() dto: UpsertFridgeDto) {
    if (!user) throw new NotFoundException('User not found, please sync first');
    return this.fridgeService.upsertFridge(user.id, dto);
  }
}
