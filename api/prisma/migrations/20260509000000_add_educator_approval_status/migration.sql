-- Migration: Add EducatorApprovalStatus enum and approval fields to users table
-- Idempotent: safe to re-run if a prior attempt left partial state.

-- 1. Create EducatorApprovalStatus enum if it doesn't exist yet
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EducatorApprovalStatus' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "EducatorApprovalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- 2. Add approvalStatus column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'approvalStatus'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "approvalStatus" "EducatorApprovalStatus";
  END IF;
END $$;

-- 3. Add approvalNotes column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'approvalNotes'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "approvalNotes" TEXT;
  END IF;
END $$;

-- 4. Add approvedAt column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'approvedAt'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "approvedAt" TIMESTAMP(3);
  END IF;
END $$;
