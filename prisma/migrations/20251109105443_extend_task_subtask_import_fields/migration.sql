/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Subtask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN     "dependencyExternalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "estimatedSec" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "state" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" TEXT,
ADD COLUMN     "xp" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dependencyExternalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "estimatedSec" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "state" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" TEXT,
ADD COLUMN     "xp" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Subtask_externalId_key" ON "Subtask"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_externalId_key" ON "Task"("externalId");
