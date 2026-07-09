-- CreateTable
CREATE TABLE "WeeklyTarget" (
    "id" SERIAL NOT NULL,
    "areaSlug" "AreaSlug" NOT NULL,
    "activity" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyEntry" (
    "id" SERIAL NOT NULL,
    "weeklyTargetId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyTarget_areaSlug_idx" ON "WeeklyTarget"("areaSlug");

-- CreateIndex
CREATE INDEX "WeeklyTarget_active_idx" ON "WeeklyTarget"("active");

-- CreateIndex
CREATE INDEX "WeeklyEntry_weekStart_idx" ON "WeeklyEntry"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyEntry_weeklyTargetId_weekStart_key" ON "WeeklyEntry"("weeklyTargetId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyTarget" ADD CONSTRAINT "WeeklyTarget_areaSlug_fkey" FOREIGN KEY ("areaSlug") REFERENCES "Area"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyEntry" ADD CONSTRAINT "WeeklyEntry_weeklyTargetId_fkey" FOREIGN KEY ("weeklyTargetId") REFERENCES "WeeklyTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
