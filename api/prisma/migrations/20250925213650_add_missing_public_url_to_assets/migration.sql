-- Add missing publicUrl column to assets table
-- This column should have been created in the initial migration but is missing in production

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
        ALTER TABLE "public"."assets" ADD COLUMN "publicUrl" TEXT NOT NULL DEFAULT '';
        
        -- Update existing records with a placeholder URL
        UPDATE "public"."assets" 
        SET "publicUrl" = 'https://placeholder.com/' || "id" 
        WHERE "publicUrl" = '';
        
        -- Remove the default constraint after populating data
        ALTER TABLE "public"."assets" ALTER COLUMN "publicUrl" DROP DEFAULT;
    END IF;
END $$;