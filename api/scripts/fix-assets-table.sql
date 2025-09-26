-- Fix missing publicUrl column in assets table
-- This script can be run manually if needed to fix the database schema

-- Check if the column exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'publicUrl'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Adding missing publicUrl column to assets table...';
        
        ALTER TABLE "public"."assets" ADD COLUMN "publicUrl" TEXT NOT NULL DEFAULT '';
        
        -- Update existing records with a placeholder URL
        UPDATE "public"."assets" 
        SET "publicUrl" = 'https://placeholder.com/' || "id" 
        WHERE "publicUrl" = '';
        
        -- Remove the default constraint after populating data
        ALTER TABLE "public"."assets" ALTER COLUMN "publicUrl" DROP DEFAULT;
        
        RAISE NOTICE 'Successfully added publicUrl column to assets table';
    ELSE
        RAISE NOTICE 'publicUrl column already exists in assets table';
    END IF;
END $$;