-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "workPackageId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectDeliverable_projectId_idx" ON "ProjectDeliverable"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectDeliverable_phaseId_idx" ON "ProjectDeliverable"("phaseId");
CREATE INDEX IF NOT EXISTS "ProjectDeliverable_workPackageId_idx" ON "ProjectDeliverable"("workPackageId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectDeliverable_projectId_fkey') THEN
    ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectDeliverable_phaseId_fkey') THEN
    ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectDeliverable_workPackageId_fkey') THEN
    ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
