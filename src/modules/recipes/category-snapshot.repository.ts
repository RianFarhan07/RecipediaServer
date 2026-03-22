import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CategorySnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  private expiresAt(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  }

  async find(category: string, offset: number) {
    const snapshot = await this.prisma.db.categorySnapshot.findUnique({
      where: { category_offset: { category, offset } },
    });
    if (!snapshot) return null;
    // Cek apakah sudah expired
    if (snapshot.expiresAt < new Date()) {
      await this.delete(category, offset);
      return null;
    }
    return snapshot;
  }

  async save(category: string, offset: number, recipes: object[]) {
    return this.prisma.db.categorySnapshot.upsert({
      where: { category_offset: { category, offset } },
      update: { recipes, expiresAt: this.expiresAt() },
      create: {
        category,
        offset,
        recipes,
        expiresAt: this.expiresAt(),
      },
    });
  }

  async delete(category: string, offset: number) {
    await this.prisma.db.categorySnapshot.deleteMany({
      where: { category, offset },
    });
  }

  // Hapus semua snapshot yang sudah expired — dipanggil oleh cron
  async deleteExpired() {
    const result = await this.prisma.db.categorySnapshot.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
