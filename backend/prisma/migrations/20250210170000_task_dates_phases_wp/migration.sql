-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectPhase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- Add columns to Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" DATE;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dueDate" DATE;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "phaseId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "workPackageId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectPhase_projectId_idx" ON "ProjectPhase"("projectId");
CREATE INDEX IF NOT EXISTS "WorkPackage_projectId_idx" ON "WorkPackage"("projectId");
CREATE INDEX IF NOT EXISTS "WorkPackage_phaseId_idx" ON "WorkPackage"("phaseId");
CREATE INDEX IF NOT EXISTS "Task_phaseId_idx" ON "Task"("phaseId");
CREATE INDEX IF NOT EXISTS "Task_workPackageId_idx" ON "Task"("workPackageId");

-- AddForeignKey (only if column exists and constraint doesn't exist - Prisma may have already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectPhase_projectId_fkey') THEN
    ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkPackage_projectId_fkey') THEN
    ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkPackage_phaseId_fkey') THEN
    ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_phaseId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_workPackageId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
