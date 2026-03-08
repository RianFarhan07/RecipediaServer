import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TrendingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private todayMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  findToday() {
    return this.prisma.db.trendingSnapshot.findUnique({
      where: { date: this.todayMidnight() },
    });
  }

  async clearToday(): Promise<void> {
    await this.prisma.db.trendingSnapshot.deleteMany({
      where: { date: this.todayMidnight() },
    });
  }

  saveToday(recipes: any[]) {
    const date = this.todayMidnight();
    return this.prisma.db.trendingSnapshot.upsert({
      where: { date },
      update: { recipes },
      create: { date, recipes },
    });
  }
}
