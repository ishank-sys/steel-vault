/*
  Warnings:

  - You are about to drop the column `estimatedBy` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `fabricatorJobNo` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `fabricatorName` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `fabricatorPMName` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `latestSubmission` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `projectIFCProgressChart` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `projectStatusReport` on the `Project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[solProjectNo]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "activeProjects" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "completedProjects" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "totalProjectValue" DECIMAL(15,2),
ADD COLUMN     "totalProjects" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWeightage" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "estimatedBy",
DROP COLUMN "fabricatorJobNo",
DROP COLUMN "fabricatorName",
DROP COLUMN "fabricatorPMName",
DROP COLUMN "latestSubmission",
DROP COLUMN "projectIFCProgressChart",
DROP COLUMN "projectStatusReport",
ADD COLUMN     "actualProjectHours" TEXT,
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "expectedCompletion" TIMESTAMP(3),
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "progress" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "projectComplexity" TEXT,
ADD COLUMN     "solProjectNo" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PLANNING';

-- CreateIndex
CREATE UNIQUE INDEX "Project_solProjectNo_key" ON "public"."Project"("solProjectNo");
