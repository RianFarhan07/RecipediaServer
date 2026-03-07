import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class FridgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.db.userFridge.findUnique({ where: { userId } });
  }

  async upsert(userId: string, items: object[], customItems: object[]) {
    return this.prisma.db.userFridge.upsert({
      where: { userId },
      create: { userId, items, customItems },
      update: { items, customItems },
    });
  }
}
