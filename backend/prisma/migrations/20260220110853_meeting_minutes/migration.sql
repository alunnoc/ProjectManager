/*
  Warnings:

  - You are about to drop the column `minutes` on the `ProjectEvent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProjectEvent" DROP COLUMN "minutes",
ADD COLUMN     "meetingMinutes" TEXT;
