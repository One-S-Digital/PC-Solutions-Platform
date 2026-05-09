-- CreateEnum
CREATE TYPE "EducatorApprovalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "approvalStatus" "EducatorApprovalStatus",
ADD COLUMN "approvalNotes" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3);
