import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        username: true,
        avatarUrl: true,
        height: true,
        weight: true,
        age: true,
        gender: true,
        activityLevel: true,
        diet: true,
        allergies: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.db.user.update({
      where: { id },
      data: {
        username: dto.username,
        height: dto.height,
        weight: dto.weight,
        age: dto.age,
        gender: dto.gender as any,
        activityLevel: dto.activityLevel as any,
        diet: dto.diet as any,
        allergies: dto.allergies,
      },
      select: {
        id: true,
        email: true,
        username: true,
        height: true,
        weight: true,
        age: true,
        gender: true,
        activityLevel: true,
        diet: true,
        allergies: true,
        updatedAt: true,
      },
    });
  }
}
