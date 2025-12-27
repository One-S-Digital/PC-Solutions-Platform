-- Run this SQL on production database BEFORE deploying the code that removes the empty migrations
-- This removes the tracking records for empty migrations that have been deleted from the codebase

DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
    '20251104134405_add_elearning_asset_kind',
    '20251104140329_add_asset_metadata_field',
    '20251105130225_add_content_fields_to_assets',
    '20251108120000_recruitment_enhancements'
);

-- Verify the cleanup
SELECT migration_name, finished_at 
FROM "_prisma_migrations" 
ORDER BY finished_at DESC 
LIMIT 10;
