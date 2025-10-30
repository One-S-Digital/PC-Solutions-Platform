-- Fix failed migration status
-- This marks the failed migration as rolled back so new migrations can run

-- Update the failed migration to rolled_back status
UPDATE _prisma_migrations 
SET finished_at = NOW(),
    rolled_back_at = NOW()
WHERE migration_name = '20251030_comprehensive_schema_audit_fix'
AND finished_at IS NULL;

-- Verify the update
SELECT migration_name, started_at, finished_at, rolled_back_at 
FROM _prisma_migrations 
WHERE migration_name LIKE '20251030%'
ORDER BY started_at DESC;
