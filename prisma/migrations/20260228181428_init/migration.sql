-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('low', 'light', 'moderate', 'high', 'very_high');

-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('gluten_free', 'ketogenic', 'vegetarian', 'lacto_vegetarian', 'ovo_vegetarian', 'vegan', 'pescetarian', 'paleo', 'primal', 'low_fodmap', 'whole30');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "age" INTEGER,
    "gender" "Gender",
    "activityLevel" "ActivityLevel",
    "diet" "DietType",
    "allergies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "spoonacularId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "imageType" TEXT,
    "servings" INTEGER,
    "readyInMinutes" INTEGER,
    "cookingMinutes" INTEGER,
    "preparationMinutes" INTEGER,
    "healthScore" DOUBLE PRECISION,
    "spoonacularScore" DOUBLE PRECISION,
    "pricePerServing" DOUBLE PRECISION,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "spoonacularSourceUrl" TEXT,
    "license" TEXT,
    "summary" TEXT,
    "instructions" TEXT,
    "vegetarian" BOOLEAN NOT NULL DEFAULT false,
    "vegan" BOOLEAN NOT NULL DEFAULT false,
    "glutenFree" BOOLEAN NOT NULL DEFAULT false,
    "dairyFree" BOOLEAN NOT NULL DEFAULT false,
    "veryHealthy" BOOLEAN NOT NULL DEFAULT false,
    "cheap" BOOLEAN NOT NULL DEFAULT false,
    "veryPopular" BOOLEAN NOT NULL DEFAULT false,
    "sustainable" BOOLEAN NOT NULL DEFAULT false,
    "lowFodmap" BOOLEAN NOT NULL DEFAULT false,
    "weightWatcherSmartPoints" INTEGER,
    "cuisines" TEXT[],
    "diets" TEXT[],
    "dishTypes" TEXT[],
    "occasions" TEXT[],
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "spoonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameClean" TEXT,
    "original" TEXT,
    "originalName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "image" TEXT,
    "aisle" TEXT,
    "consistency" TEXT,
    "meta" TEXT[],

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzedInstruction" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "AnalyzedInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructionStep" (
    "id" TEXT NOT NULL,
    "instructionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "step" TEXT NOT NULL,

    CONSTRAINT "InstructionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepIngredient" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "spoonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "StepIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepEquipment" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "spoonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "StepEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_spoonacularId_key" ON "Recipe"("spoonacularId");

-- CreateIndex
CREATE INDEX "Recipe_spoonacularId_idx" ON "Recipe"("spoonacularId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "AnalyzedInstruction_recipeId_idx" ON "AnalyzedInstruction"("recipeId");

-- CreateIndex
CREATE INDEX "InstructionStep_instructionId_idx" ON "InstructionStep"("instructionId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_recipeId_key" ON "Favorite"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyzedInstruction" ADD CONSTRAINT "AnalyzedInstruction_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructionStep" ADD CONSTRAINT "InstructionStep_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "AnalyzedInstruction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepIngredient" ADD CONSTRAINT "StepIngredient_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "InstructionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepEquipment" ADD CONSTRAINT "StepEquipment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "InstructionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
