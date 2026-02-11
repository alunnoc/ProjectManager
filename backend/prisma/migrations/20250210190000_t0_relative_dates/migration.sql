-- Add T0 and relative date columns
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "t0Date" DATE;

ALTER TABLE "ProjectPhase" ADD COLUMN IF NOT EXISTS "startDateRelative" TEXT;
ALTER TABLE "ProjectPhase" ADD COLUMN IF NOT EXISTS "endDateRelative" TEXT;

ALTER TABLE "WorkPackage" ADD COLUMN IF NOT EXISTS "startDate" DATE;
ALTER TABLE "WorkPackage" ADD COLUMN IF NOT EXISTS "endDate" DATE;
ALTER TABLE "WorkPackage" ADD COLUMN IF NOT EXISTS "startDateRelative" TEXT;
ALTER TABLE "WorkPackage" ADD COLUMN IF NOT EXISTS "endDateRelative" TEXT;

ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "dueDateRelative" TEXT;
