DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assets'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "assets"
        ADD COLUMN "metadata" JSONB;
    END IF;
END
$$;
