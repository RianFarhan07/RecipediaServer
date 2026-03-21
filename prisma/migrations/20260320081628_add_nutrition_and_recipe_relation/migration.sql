-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('breakfast', 'lunch', 'dinner');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "carbs" INTEGER,
ADD COLUMN     "fat" INTEGER,
ADD COLUMN     "protein" INTEGER;

-- CreateTable
CREATE TABLE "MealPlanEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealSlot" NOT NULL,
    "spoonacularId" INTEGER NOT NULL,
    "recipeTitle" TEXT NOT NULL,
    "recipeImage" TEXT,
    "readyInMinutes" INTEGER,
    "servings" INTEGER,
    "recipeId" TEXT,
    "note" TEXT,
    "makeDouble" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealPlanEntry_userId_date_idx" ON "MealPlanEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "MealPlanEntry_userId_idx" ON "MealPlanEntry"("userId");

-- AddForeignKey
ALTER TABLE "MealPlanEntry" ADD CONSTRAINT "MealPlanEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanEntry" ADD CONSTRAINT "MealPlanEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
