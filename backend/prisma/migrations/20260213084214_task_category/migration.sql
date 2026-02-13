-- DropIndex
DROP INDEX "ProjectPhase_projectId_idx";

-- DropIndex
DROP INDEX "Task_phaseId_idx";

-- DropIndex
DROP INDEX "Task_workPackageId_idx";

-- DropIndex
DROP INDEX "WorkPackage_phaseId_idx";

-- DropIndex
DROP INDEX "WorkPackage_projectId_idx";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT;
