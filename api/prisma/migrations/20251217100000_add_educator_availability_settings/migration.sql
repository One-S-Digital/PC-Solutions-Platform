-- Add availabilitySettings JSON column to users table for Calendly-style scheduling
-- This column stores structured availability data including:
-- - Employment type (FULL_TIME, PART_TIME, CUSTOM_SCHEDULE)
-- - Weekly schedule with time slots for each day
-- - Date overrides for special dates (vacations, holidays, extra hours)
-- - Timezone and additional notes

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "availabilitySettings" JSONB;

-- Add a comment to document the field
COMMENT ON COLUMN "users"."availabilitySettings" IS 'Structured availability settings for educators (Calendly-style scheduling). Contains employmentType, weeklySchedule, dateOverrides, timezone, and notes.';

-- Create an index for querying by employment type (commonly used in searches)
CREATE INDEX IF NOT EXISTS "users_availability_employment_type_idx" ON "users" ((("availabilitySettings"->>'employmentType')));
