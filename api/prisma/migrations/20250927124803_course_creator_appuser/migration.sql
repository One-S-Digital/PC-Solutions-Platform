-- Safe migration for course creator foreign key
-- This migration handles the transition from User to AppUser for course creators

-- Step 1: Check if courses table exists and has data
DO $$
BEGIN
    -- Only proceed if courses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses' AND table_schema = 'public') THEN
        
        -- Step 2: Create AppUser records for any missing course creators
        -- First, ensure we have a system user for orphaned courses
        INSERT INTO "AppUser" ("id", "clerkId", "role", "createdAt", "updatedAt")
        SELECT gen_random_uuid(), 'system-course-creators', 'PARENT', NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM "AppUser" WHERE "clerkId" = 'system-course-creators'
        );
        
        -- Step 3: Update courses with invalid createdBy references to point to system user
        UPDATE "courses" 
        SET "createdBy" = (
            SELECT id FROM "AppUser" WHERE "clerkId" = 'system-course-creators'
        )
        WHERE "createdBy" NOT IN (
            SELECT id FROM "AppUser"
        );
        
        -- Step 4: Drop the old foreign key constraint if it exists
        ALTER TABLE "public"."courses" DROP CONSTRAINT IF EXISTS "courses_createdBy_fkey";
        
        -- Step 5: Add the new foreign key constraint
        ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "public"."AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
    END IF;
END $$;

