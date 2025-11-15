-- =====================================================================
-- Verification Script: Organization Asset Columns
-- =====================================================================
-- Run this after applying the migration to verify everything is correct
-- Usage: psql $DATABASE_URL -f api/scripts/verify-organization-columns.sql
-- =====================================================================

\echo ''
\echo '====================================================================='
\echo 'VERIFYING ORGANIZATION ASSET COLUMNS'
\echo '====================================================================='
\echo ''

-- Check if columns exist
\echo '1. Checking if columns exist...'
\echo ''
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'organizations' 
    AND column_name IN ('logoAssetId', 'coverAssetId')
ORDER BY column_name;

\echo ''
\echo '2. Checking foreign key constraints...'
\echo ''
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'organizations'
    AND kcu.column_name IN ('logoAssetId', 'coverAssetId');

\echo ''
\echo '3. Checking organizations table structure...'
\echo ''
SELECT 
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN "logoAssetId" IS NOT NULL THEN 1 END) as orgs_with_logo,
    COUNT(CASE WHEN "coverAssetId" IS NOT NULL THEN 1 END) as orgs_with_cover
FROM organizations;

\echo ''
\echo '4. Sample organization data (first 5 organizations)...'
\echo ''
SELECT 
    id,
    name,
    type,
    "logoAssetId",
    "coverAssetId",
    "isActive"
FROM organizations
ORDER BY "createdAt" DESC
LIMIT 5;

\echo ''
\echo '====================================================================='
\echo 'VERIFICATION COMPLETE'
\echo '====================================================================='
\echo ''
\echo 'Expected results:'
\echo '  ✅ Step 1: Should show 2 rows (logoAssetId and coverAssetId)'
\echo '  ✅ Step 2: Should show 2 foreign key constraints'
\echo '  ✅ Step 3: Should show organization counts'
\echo '  ✅ Step 4: Should show sample organizations with new columns'
\echo ''
\echo 'If all checks pass, the migration was successful!'
\echo ''
