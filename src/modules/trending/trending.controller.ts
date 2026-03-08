import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TrendingService } from './trending.service';

@ApiTags('Trending')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  @ApiOperation({ summary: 'Get trending recipes for today (cached daily)' })
  getTrending() {
    return this.trendingService.getTrending();
  }

  @Delete('refresh')
  @ApiOperation({ summary: 'Force refresh today\'s trending snapshot' })
  refresh() {
    return this.trendingService.refreshTrending();
  }
}
