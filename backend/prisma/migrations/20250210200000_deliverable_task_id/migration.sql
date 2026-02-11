-- AlterTable
ALTER TABLE "ProjectDeliverable" ADD COLUMN "taskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDeliverable_taskId_key" ON "ProjectDeliverable"("taskId");

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
