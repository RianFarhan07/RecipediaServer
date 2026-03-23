import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { MealPlanModule } from './modules/meal-plan/meal-plan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService) => ({
        stores: [createKeyv(config.get<string>('redis.url') ?? 'redis://localhost:6379')],
      }),
      inject: [ConfigService],
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
    MealPlanModule,
  ],
})
export class AppModule {}
