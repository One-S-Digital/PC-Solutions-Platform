-- Verification Script for Educator Availability Settings
-- This script verifies that the database schema is correctly set up for
-- the Calendly-style educator availability scheduling feature.

-- ============================================================
-- 1. Check if availabilitySettings column exists
-- ============================================================
SELECT 
    'availabilitySettings column' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'availabilitySettings'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- ============================================================
-- 2. Check column type is JSONB
-- ============================================================
SELECT 
    'availabilitySettings type is JSONB' as check_item,
    CASE 
        WHEN data_type = 'jsonb' THEN '✅ CORRECT'
        ELSE '❌ INCORRECT: ' || data_type
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'availabilitySettings';

-- ============================================================
-- 3. Check if index exists for employment type queries
-- ============================================================
SELECT 
    'Employment type index' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND indexname = 'users_availability_employment_type_idx'
        ) THEN '✅ EXISTS'
        ELSE '⚠️ MISSING (optional but recommended)'
    END as status;

-- ============================================================
-- 4. Check existing users table structure
-- ============================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================
-- 5. Count educators with availability settings configured
-- ============================================================
SELECT 
    'Educators with availability settings' as metric,
    COUNT(*) as count
FROM users 
WHERE role = 'EDUCATOR' 
AND "availabilitySettings" IS NOT NULL;

-- ============================================================
-- 6. Sample availability settings data (if any)
-- ============================================================
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    ("availabilitySettings"->>'employmentType') as employment_type,
    ("availabilitySettings"->>'timezone') as timezone
FROM users 
WHERE "availabilitySettings" IS NOT NULL
LIMIT 5;
