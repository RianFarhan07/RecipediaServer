import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MealPlanService } from './meal-plan.service';
import { CreateMealPlanEntryDto } from './dto/create-meal-plan-entry.dto';
import { UpdateMealPlanEntryDto } from './dto/update-meal-plan-entry.dto';
import { MoveMealPlanEntryDto } from './dto/move-meal-plan-entry.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.deconator';

@ApiTags('Meal Plan')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('meal-plan')
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Get meal plan entries for a date range' })
  @ApiQuery({ name: 'startDate', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', example: '2026-03-31' })
  getByRange(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.getByRange(user.id, startDate, endDate);
  }

  @Post()
  @ApiOperation({ summary: 'Add a meal plan entry' })
  addEntry(@CurrentUser() user: any, @Body() dto: CreateMealPlanEntryDto) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.addEntry(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note or makeDouble on an entry' })
  updateEntry(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateMealPlanEntryDto,
  ) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.updateEntry(user.id, id, dto);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move a meal entry to a different date/slot' })
  moveEntry(@CurrentUser() user: any, @Body() dto: MoveMealPlanEntryDto) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.moveEntry(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal plan entry' })
  deleteEntry(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.deleteEntry(user.id, id);
  }

  @Get('shopping-list')
  @ApiOperation({ summary: 'Get aggregated ingredients shopping list for a date range' })
  @ApiQuery({ name: 'startDate', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', example: '2026-03-07' })
  getShoppingList(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.getShoppingList(user.id, startDate, endDate);
  }

  @Post('copy-last-week')
  @ApiOperation({ summary: 'Copy last week meal plan entries to target week' })
  copyLastWeek(
    @CurrentUser() user: any,
    @Body() body: { targetWeekStart: string },
  ) {
    if (!user) throw new NotFoundException('User not found');
    return this.mealPlanService.copyLastWeek(user.id, body.targetWeekStart);
  }
}
