/*
  Warnings:

  - You are about to drop the column `category` on the `Goal` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Project` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AreaSlug" AS ENUM ('work', 'business', 'content', 'health', 'personal', 'study');

-- DropIndex
DROP INDEX "Goal_category_idx";

-- DropIndex
DROP INDEX "Project_category_idx";

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "category",
ADD COLUMN     "areaSlug" "AreaSlug";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "category",
ADD COLUMN     "areaSlug" "AreaSlug";

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "slug" "AreaSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

-- CreateIndex
CREATE INDEX "Goal_areaSlug_idx" ON "Goal"("areaSlug");

-- CreateIndex
CREATE INDEX "Project_areaSlug_idx" ON "Project"("areaSlug");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_areaSlug_fkey" FOREIGN KEY ("areaSlug") REFERENCES "Area"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_areaSlug_fkey" FOREIGN KEY ("areaSlug") REFERENCES "Area"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
