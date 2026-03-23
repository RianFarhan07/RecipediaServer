-- CreateEnum
CREATE TYPE "FitnessGoal" AS ENUM ('lose_weight', 'maintain', 'gain_muscle');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fitnessGoal" "FitnessGoal",
ADD COLUMN     "targetWeight" DOUBLE PRECISION,
ADD COLUMN     "weeklyGoal" DOUBLE PRECISION;
