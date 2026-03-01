import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SyncUserDto, RegisterDto, LoginDto } from './dto/sync-user.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from 'src/common/decorators/public.deconator';
import { CurrentUser } from 'src/common/decorators/current-user.deconator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register with email & password' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email & password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('sync')
  @ApiOperation({ summary: 'Sync Supabase user to DB after OAuth login' })
  sync(@Body() dto: SyncUserDto) {
    return this.authService.syncUser(dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  me(@CurrentUser() user: any) {
    return user;
  }
}
