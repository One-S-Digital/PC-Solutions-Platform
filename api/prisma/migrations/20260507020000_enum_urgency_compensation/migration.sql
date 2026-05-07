-- Migration: Convert urgency and compensationType to proper DB enums
-- Rejects invalid values at the database boundary.
-- Idempotent: safe to re-run if a prior attempt left partial state.

-- 1. Create UrgencyLevel enum if it doesn't exist yet
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UrgencyLevel') THEN
    CREATE TYPE "UrgencyLevel" AS ENUM ('NORMAL', 'URGENT');
  END IF;
END $$;

-- 2. Create CompensationType enum if it doesn't exist yet
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompensationType') THEN
    CREATE TYPE "CompensationType" AS ENUM ('PAID', 'UNPAID', 'STIPEND');
  END IF;
END $$;

-- 3. Convert replacement_requests.urgency TEXT → UrgencyLevel (only if still TEXT)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'replacement_requests'
      AND column_name = 'urgency'
      AND data_type = 'text'
  ) THEN
    UPDATE "replacement_requests"
      SET "urgency" = 'NORMAL'
      WHERE "urgency" NOT IN ('NORMAL', 'URGENT');

    ALTER TABLE "replacement_requests"
      ALTER COLUMN "urgency" TYPE "UrgencyLevel"
      USING "urgency"::"UrgencyLevel";

    ALTER TABLE "replacement_requests"
      ALTER COLUMN "urgency" SET DEFAULT 'NORMAL'::"UrgencyLevel";
  END IF;
END $$;

-- 4. Convert intern_pool_requests.compensationType TEXT → CompensationType (only if still TEXT)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intern_pool_requests'
      AND column_name = 'compensationType'
      AND data_type = 'text'
  ) THEN
    UPDATE "intern_pool_requests"
      SET "compensationType" = 'UNPAID'
      WHERE "compensationType" NOT IN ('PAID', 'UNPAID', 'STIPEND');

    ALTER TABLE "intern_pool_requests"
      ALTER COLUMN "compensationType" TYPE "CompensationType"
      USING "compensationType"::"CompensationType";

    ALTER TABLE "intern_pool_requests"
      ALTER COLUMN "compensationType" SET DEFAULT 'UNPAID'::"CompensationType";
  END IF;
END $$;
