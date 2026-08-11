-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'PAUSED', 'CLOSED', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "JobVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_employerId_idx" ON "jobs"("employerId");

-- CreateIndex
CREATE INDEX "jobs_organizationId_idx" ON "jobs"("organizationId");

-- CreateIndex
CREATE INDEX "jobs_expiresAt_idx" ON "jobs"("expiresAt");
