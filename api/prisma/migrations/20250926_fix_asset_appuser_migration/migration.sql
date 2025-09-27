-- Fix asset migration to handle missing uploadedBy column and proper data migration
-- This migration safely handles the transition from users.id to AppUser.id for assets

-- Step 1: Check if uploadedBy column exists and handle accordingly
DO $$ 
BEGIN
    -- Check if uploadedBy column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'uploadedBy'
        AND table_schema = 'public'
    ) THEN
        -- Column exists, we need to migrate the data
        
        -- Step 2: Create a temporary column to store the new AppUser IDs
        ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "uploadedById_temp" TEXT;
        
        -- Step 3: Backfill the temporary column with AppUser IDs
        -- This maps users.id to AppUser.id via clerkId
        UPDATE "assets" 
        SET "uploadedById_temp" = (
            SELECT au.id 
            FROM "AppUser" au 
            JOIN "users" u ON u."clerkId" = au."clerkId" 
            WHERE u.id = "assets"."uploadedBy"
        )
        WHERE "uploadedBy" IS NOT NULL;
        
        -- Step 4: Handle any assets that couldn't be mapped
        -- Create a default AppUser for orphaned assets if needed
        INSERT INTO "AppUser" ("id", "clerkId", "role", "createdAt", "updatedAt")
        SELECT gen_random_uuid(), 'system-orphaned-assets', 'PARENT', NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM "AppUser" WHERE "clerkId" = 'system-orphaned-assets'
        );
        
        -- Step 5: Update orphaned assets to use the system user
        UPDATE "assets" 
        SET "uploadedById_temp" = (
            SELECT id FROM "AppUser" WHERE "clerkId" = 'system-orphaned-assets'
        )
        WHERE "uploadedById_temp" IS NULL AND "uploadedBy" IS NOT NULL;
        
        -- Step 6: Drop the old foreign key constraint
        ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_uploadedBy_fkey";
        
        -- Step 7: Rename the column
        ALTER TABLE "assets" RENAME COLUMN "uploadedBy" TO "uploadedById";
        
        -- Step 8: Copy the temporary data to the main column
        UPDATE "assets" 
        SET "uploadedById" = "uploadedById_temp" 
        WHERE "uploadedById_temp" IS NOT NULL;
        
        -- Step 9: Drop the temporary column
        ALTER TABLE "assets" DROP COLUMN "uploadedById_temp";
        
        -- Step 10: Add the new foreign key constraint
        ALTER TABLE "assets"
        ADD CONSTRAINT "assets_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
    ELSE
        -- Column doesn't exist, check if uploadedById already exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
            AND column_name = 'uploadedById'
            AND table_schema = 'public'
        ) THEN
            -- Column already exists, just ensure the foreign key is correct
            ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_uploadedById_fkey";
            ALTER TABLE "assets"
            ADD CONSTRAINT "assets_uploadedById_fkey"
            FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        ELSE
            -- Neither column exists, create uploadedById with a default value
            ALTER TABLE "assets" ADD COLUMN "uploadedById" TEXT;
            
            -- Create a default AppUser for existing assets
            INSERT INTO "AppUser" ("id", "clerkId", "role", "createdAt", "updatedAt")
            SELECT gen_random_uuid(), 'system-existing-assets', 'PARENT', NOW(), NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM "AppUser" WHERE "clerkId" = 'system-existing-assets'
            );
            
            -- Set all existing assets to use the default user
            UPDATE "assets" 
            SET "uploadedById" = (
                SELECT id FROM "AppUser" WHERE "clerkId" = 'system-existing-assets'
            )
            WHERE "uploadedById" IS NULL;
            
            -- Make the column NOT NULL
            ALTER TABLE "assets" ALTER COLUMN "uploadedById" SET NOT NULL;
            
            -- Add the foreign key constraint
            ALTER TABLE "assets"
            ADD CONSTRAINT "assets_uploadedById_fkey"
            FOREIGN KEY ("uploadedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 11: Update AppUser table structure
ALTER TABLE "AppUser" RENAME COLUMN "clerkUserId" TO "clerkId";
ALTER INDEX IF EXISTS "AppUser_clerkUserId_key" RENAME TO "AppUser_clerkId_key";
ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "email" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email");