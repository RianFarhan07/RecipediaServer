import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { createKeyv } from '@keyv/redis';
import { AuthModule } from './modules/auth/auth.module';
import configuration from './config/configuration';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AiModule } from './modules/ai/ai.module';
import { FridgeModule } from './modules/fridge/fridge.module';
import { TrendingModule } from './modules/trending/trending.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        stores: [createKeyv('redis://localhost:6379')],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    RecipesModule,
    FavoritesModule,
    AiModule,
    FridgeModule,
    TrendingModule,
  ],
})
export class AppModule {}
