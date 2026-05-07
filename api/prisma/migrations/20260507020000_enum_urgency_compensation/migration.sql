-- Migration: Convert urgency and compensationType to proper DB enums
-- Rejects invalid values at the database boundary.

-- 1. Create the new enums
CREATE TYPE "UrgencyLevel" AS ENUM ('NORMAL', 'URGENT');
CREATE TYPE "CompensationType" AS ENUM ('PAID', 'UNPAID', 'STIPEND');

-- 2. Convert replacement_requests.urgency String → UrgencyLevel
--    Coerce any unexpected values to NORMAL before casting.
UPDATE "replacement_requests"
  SET "urgency" = 'NORMAL'
  WHERE "urgency" NOT IN ('NORMAL', 'URGENT');

ALTER TABLE "replacement_requests"
  ALTER COLUMN "urgency" TYPE "UrgencyLevel"
  USING "urgency"::"UrgencyLevel";

ALTER TABLE "replacement_requests"
  ALTER COLUMN "urgency" SET DEFAULT 'NORMAL'::"UrgencyLevel";

-- 3. Convert intern_pool_requests.compensationType String → CompensationType
UPDATE "intern_pool_requests"
  SET "compensationType" = 'UNPAID'
  WHERE "compensationType" NOT IN ('PAID', 'UNPAID', 'STIPEND');

ALTER TABLE "intern_pool_requests"
  ALTER COLUMN "compensationType" TYPE "CompensationType"
  USING "compensationType"::"CompensationType";

ALTER TABLE "intern_pool_requests"
  ALTER COLUMN "compensationType" SET DEFAULT 'UNPAID'::"CompensationType";
