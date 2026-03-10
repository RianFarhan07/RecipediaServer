import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const ALL_ITEMS = [
  { id: 'milk', emoji: '🥛', label: 'Milk', zone: 'door' },
  { id: 'egg', emoji: '🥚', label: 'Egg', zone: 'door' },
  { id: 'cheese', emoji: '🧀', label: 'Cheese', zone: 'door' },
  { id: 'garlic', emoji: '🧄', label: 'Garlic', zone: 'door' },
  { id: 'onion', emoji: '🧅', label: 'Onion', zone: 'door' },
  { id: 'butter', emoji: '🧈', label: 'Butter', zone: 'door' },
  { id: 'tomato', emoji: '🍅', label: 'Tomato', zone: 'door' },
  { id: 'potato', emoji: '🥔', label: 'Potato', zone: 'door' },
  { id: 'sauce', emoji: '🫙', label: 'Sauce', zone: 'door' },
  { id: 'juice', emoji: '🧃', label: 'Juice', zone: 'door' },
  { id: 'yogurt', emoji: '🫙', label: 'Yogurt', zone: 'door' },
  { id: 'beef', emoji: '🥩', label: 'Beef', zone: 'freezer' },
  { id: 'shrimp', emoji: '🦐', label: 'Shrimp', zone: 'freezer' },
  { id: 'icecream', emoji: '🍦', label: 'Ice Cream', zone: 'freezer' },
  { id: 'fish', emoji: '🐟', label: 'Fish', zone: 'freezer' },
  { id: 'dumpling', emoji: '🥟', label: 'Dumpling', zone: 'freezer' },
  { id: 'chicken', emoji: '🍗', label: 'Chicken', zone: 'interior' },
  { id: 'carrot', emoji: '🥕', label: 'Carrot', zone: 'interior' },
  { id: 'mushroom', emoji: '🍄', label: 'Mushroom', zone: 'interior' },
  { id: 'noodle', emoji: '🍜', label: 'Noodle', zone: 'interior' },
  { id: 'tofu', emoji: '🫘', label: 'Tofu', zone: 'interior' },
  { id: 'spinach', emoji: '🥬', label: 'Spinach', zone: 'interior' },
  { id: 'apple', emoji: '🍎', label: 'Apple', zone: 'interior' },
  { id: 'pepper', emoji: '🫑', label: 'Pepper', zone: 'interior' },
  { id: 'corn', emoji: '🌽', label: 'Corn', zone: 'interior' },
  { id: 'lemon', emoji: '🍋', label: 'Lemon', zone: 'interior' },
  { id: 'pork', emoji: '🥓', label: 'Pork', zone: 'interior' },
  { id: 'sausage', emoji: '🌭', label: 'Sausage', zone: 'interior' },
  { id: 'broccoli', emoji: '🥦', label: 'Broccoli', zone: 'interior' },
  { id: 'grape', emoji: '🍇', label: 'Grape', zone: 'interior' },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter } as any);
  await prisma.$connect();

  const fridges = await (prisma as any).userFridge.findMany();
  let migrated = 0;

  for (const fridge of fridges) {
    const existingCustom = (fridge.customItems as any[]) ?? [];

    // Cek apakah sudah di-migrate (sudah punya semua ALL_ITEMS)
    const alreadyMigrated = ALL_ITEMS.every((item) =>
      existingCustom.some((c: any) => c.id === item.id),
    );
    if (alreadyMigrated) {
      console.log(`Skipped (already migrated): ${fridge.userId}`);
      continue;
    }

    // Merge: ALL_ITEMS sebagai base, tambah custom user yang tidak ada di default
    const mergedCustom = [
      ...ALL_ITEMS,
      ...existingCustom.filter(
        (c: any) => !ALL_ITEMS.some((d) => d.id === c.id),
      ),
    ];

    await (prisma as any).userFridge.update({
      where: { userId: fridge.userId },
      data: { customItems: mergedCustom },
    });

    migrated++;
    console.log(`Migrated: ${fridge.userId}`);
  }

  console.log(
    `\nDone. ${migrated} fridge(s) migrated, ${fridges.length - migrated} skipped.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
