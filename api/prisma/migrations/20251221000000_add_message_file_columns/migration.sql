-- =====================================================================
-- ADD MISSING FILE COLUMNS TO MESSAGES TABLE
-- =====================================================================
-- This migration adds fileUrl, fileName, fileSize, and mimeType columns
-- to the messages table to support file attachments in messaging.
-- 
-- These columns were defined in the Prisma schema but never migrated.
-- Error: "The column `messages.fileUrl` does not exist in the current database."
-- =====================================================================

-- Add fileUrl column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileUrl'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileUrl" TEXT;
        RAISE NOTICE '✅ Added fileUrl column to messages table';
    ELSE
        RAISE NOTICE '⏭️  fileUrl column already exists in messages table';
    END IF;
END $$;

-- Add fileName column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileName'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileName" TEXT;
        RAISE NOTICE '✅ Added fileName column to messages table';
    ELSE
        RAISE NOTICE '⏭️  fileName column already exists in messages table';
    END IF;
END $$;

-- Add fileSize column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "fileSize" INTEGER;
        RAISE NOTICE '✅ Added fileSize column to messages table';
    ELSE
        RAISE NOTICE '⏭️  fileSize column already exists in messages table';
    END IF;
END $$;

-- Add mimeType column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'mimeType'
    ) THEN
        ALTER TABLE "public"."messages" ADD COLUMN "mimeType" TEXT;
        RAISE NOTICE '✅ Added mimeType column to messages table';
    ELSE
        RAISE NOTICE '⏭️  mimeType column already exists in messages table';
    END IF;
END $$;

-- =====================================================================
-- VERIFICATION
-- =====================================================================
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages';
    
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '✅ MESSAGE FILE COLUMNS MIGRATION COMPLETE';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE 'Total columns in messages table: %', column_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Columns added/verified:';
    RAISE NOTICE '  ✅ fileUrl - URL/storage key for file attachments';
    RAISE NOTICE '  ✅ fileName - Original filename for downloads';
    RAISE NOTICE '  ✅ fileSize - File size in bytes';
    RAISE NOTICE '  ✅ mimeType - MIME type of the file';
    RAISE NOTICE '=====================================================================';
END $$;
