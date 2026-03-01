import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SyncUserDto, RegisterDto, LoginDto } from './dto/sync-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  private supabase;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('supabase.url') ?? '',
      this.configService.get<string>('supabase.serviceKey') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  // ============================================
  // Register dengan email/password
  // ============================================
  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { full_name: dto.username },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      throw new InternalServerErrorException(error.message);
    }

    // Sync ke DB
    const user = await this.prisma.db.user.create({
      data: {
        supabaseId: data.user.id,
        email: data.user.email!,
        username: dto.username,
      },
    });

    // Login langsung untuk dapat token
    const { data: signInData, error: signInError } =
      await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (signInError)
      throw new InternalServerErrorException(signInError.message);

    return {
      user,
      session: {
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      },
    };
  }

  // ============================================
  // Login dengan email/password
  // ============================================
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Sync/get user dari DB
    const user = await this.syncUser({
      supabaseId: data.user.id,
      email: data.user.email!,
      username: data.user.user_metadata?.full_name,
      avatarUrl: data.user.user_metadata?.avatar_url,
    });

    return {
      user,
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
    };
  }

  // ============================================
  // Sync Supabase user ke DB
  // ============================================
  async syncUser(dto: SyncUserDto) {
    return this.prisma.db.user.upsert({
      where: { supabaseId: dto.supabaseId },
      update: {
        email: dto.email,
        username: dto.username,
        avatarUrl: dto.avatarUrl,
      },
      create: {
        supabaseId: dto.supabaseId,
        email: dto.email,
        username: dto.username,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async getUserBySupabaseId(supabaseId: string) {
    return this.prisma.db.user.findUnique({
      where: { supabaseId },
    });
  }
}
