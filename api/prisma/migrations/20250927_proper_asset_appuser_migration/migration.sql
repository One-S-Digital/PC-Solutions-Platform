-- Proper Asset to AppUser Migration
-- This migration handles the actual production database state

-- Step 1: Add email column to AppUser if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'AppUser' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "AppUser" ADD COLUMN "email" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email");
    END IF;
END $$;

-- Step 2: Ensure organizations table has isActive column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'isActive'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "organizations" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Step 3: Migrate assets from users.id to AppUser.id
DO $$
BEGIN
    -- Check if assets table has uploadedBy column (production state)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'uploadedBy'
        AND table_schema = 'public'
    ) THEN
        -- Create temporary column for new AppUser IDs
        ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "uploadedById_temp" TEXT;
        
        -- Map users.id to AppUser.id via clerkId
        UPDATE "assets" 
        SET "uploadedById_temp" = (
            SELECT au.id 
            FROM "AppUser" au 
            JOIN "users" u ON u."clerkId" = au."clerkUserId" 
            WHERE u.id = "assets"."uploadedBy"
        )
        WHERE "uploadedBy" IS NOT NULL;
        
        -- Handle orphaned assets - create system AppUser
        INSERT INTO "AppUser" ("id", "clerkUserId", "role", "createdAt", "updatedAt")
        SELECT gen_random_uuid(), 'system-orphaned-assets', 'PARENT', NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM "AppUser" WHERE "clerkUserId" = 'system-orphaned-assets'
        );
        
        -- Assign orphaned assets to system user
        UPDATE "assets" 
        SET "uploadedById_temp" = (
            SELECT id FROM "AppUser" WHERE "clerkUserId" = 'system-orphaned-assets'
        )
        WHERE "uploadedById_temp" IS NULL AND "uploadedBy" IS NOT NULL;
        
        -- Drop old foreign key constraint
        ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_uploadedBy_fkey";
        
        -- Rename column
        ALTER TABLE "assets" RENAME COLUMN "uploadedBy" TO "uploadedById";
        
        -- Copy data from temp column
        UPDATE "assets" 
        SET "uploadedById" = "uploadedById_temp" 
        WHERE "uploadedById_temp" IS NOT NULL;
        
        -- Drop temp column
        ALTER TABLE "assets" DROP COLUMN "uploadedById_temp";
        
        -- Add new foreign key constraint
        ALTER TABLE "assets"
        ADD CONSTRAINT "assets_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
    END IF;
END $$;

-- Step 4: Rename clerkUserId to clerkId for consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'AppUser' 
        AND column_name = 'clerkUserId'
        AND table_schema = 'public'
    ) THEN
        -- Rename column
        ALTER TABLE "AppUser" RENAME COLUMN "clerkUserId" TO "clerkId";
        
        -- Rename index
        ALTER INDEX IF EXISTS "AppUser_clerkUserId_key" RENAME TO "AppUser_clerkId_key";
    END IF;
END $$;