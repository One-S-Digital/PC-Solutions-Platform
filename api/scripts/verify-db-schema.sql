-- =====================================================================
-- DATABASE SCHEMA VERIFICATION SCRIPT
-- =====================================================================
-- This script checks if all required tables and columns exist
-- Run this on your production database to verify schema completeness
-- =====================================================================

\echo '🔍 Starting Database Schema Verification...'
\echo ''

-- =====================================================================
-- SECTION 1: CHECK ALL TABLES EXIST
-- =====================================================================
\echo '📋 Checking if all required tables exist...'
\echo ''

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    required_tables TEXT[] := ARRAY[
        'users', 'organizations', 'user_organizations', 'assets',
        'products', 'catalogs', 'services', 'service_providers',
        'job_listings', 'job_applications', 'subscriptions',
        'orders', 'order_items', 'service_requests', 'parent_leads',
        'entity_sources', 'entity_translations', 'plans', 'plan_prices',
        'user_subscriptions', 'licenses', 'course_categories', 'courses',
        'course_modules', 'course_lessons', 'course_enrollments',
        'lesson_progress', 'course_quizzes', 'quiz_questions',
        'quiz_answers', 'quiz_attempts', 'certificates',
        'course_discussions', 'discussion_replies', 'conversations',
        'conversation_participants', 'messages', 'frontend_settings',
        'user_activities', 'content_moderation', 'moderation_actions',
        'email_templates', 'email_logs', 'scheduled_emails',
        'user_notification_preferences', 'subscription_plans',
        'pricing_tiers', 'dynamic_pricing_rules', 'feature_flags',
        'billing_transactions', 'system_settings', 'integration_configs',
        'maintenance_mode', 'maintenance_schedules', 'AppUser',
        'AppUserRoleHistory', 'Outbox', 'platform_settings',
        'audit_logs', 'system_health_checks', 'system_metrics',
        'system_alerts', 'content_items', 'content_categories',
        'policy_alerts', 'api_keys', 'webhooks', 'webhook_logs'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING '❌ Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All required tables exist!';
    END IF;
END $$;

\echo ''
\echo '=====================================================================';
\echo ''

-- =====================================================================
-- SECTION 2: CHECK CRITICAL COLUMNS FOR USER SIGNUP/LOGIN
-- =====================================================================
\echo '👤 Checking critical columns for user signup/login...'
\echo ''

-- Check users table critical columns
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN
        missing_columns := array_append(missing_columns, 'users.id');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'clerkId') THEN
        missing_columns := array_append(missing_columns, 'users.clerkId');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        missing_columns := array_append(missing_columns, 'users.email');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'firstName') THEN
        missing_columns := array_append(missing_columns, 'users.firstName');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastName') THEN
        missing_columns := array_append(missing_columns, 'users.lastName');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        missing_columns := array_append(missing_columns, 'users.role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripeCustomerId') THEN
        missing_columns := array_append(missing_columns, 'users.stripeCustomerId');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isActive') THEN
        missing_columns := array_append(missing_columns, 'users.isActive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        missing_columns := array_append(missing_columns, 'users.createdAt');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        missing_columns := array_append(missing_columns, 'users.updatedAt');
    END IF;
    
    -- Check AppUser table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AppUser' AND column_name = 'id') THEN
        missing_columns := array_append(missing_columns, 'AppUser.id');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AppUser' AND column_name = 'clerkId') THEN
        missing_columns := array_append(missing_columns, 'AppUser.clerkId');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AppUser' AND column_name = 'email') THEN
        missing_columns := array_append(missing_columns, 'AppUser.email');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AppUser' AND column_name = 'role') THEN
        missing_columns := array_append(missing_columns, 'AppUser.role');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING '❌ Missing critical columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ All critical user columns exist!';
    END IF;
END $$;

\echo ''
\echo '=====================================================================';
\echo ''

-- =====================================================================
-- SECTION 3: CHECK INDEXES FOR PERFORMANCE
-- =====================================================================
\echo '⚡ Checking critical indexes...'
\echo ''

DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Critical indexes for user operations
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_clerkId_key') THEN
        missing_indexes := array_append(missing_indexes, 'users.clerkId (unique)');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_email_key') THEN
        missing_indexes := array_append(missing_indexes, 'users.email (unique)');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_stripeCustomerId_key') THEN
        missing_indexes := array_append(missing_indexes, 'users.stripeCustomerId (unique)');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'AppUser' AND indexname = 'AppUser_clerkId_key') THEN
        missing_indexes := array_append(missing_indexes, 'AppUser.clerkId (unique)');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'AppUser' AND indexname = 'AppUser_email_key') THEN
        missing_indexes := array_append(missing_indexes, 'AppUser.email (unique)');
    END IF;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING '❌ Missing critical indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ All critical indexes exist!';
    END IF;
END $$;

\echo ''
\echo '=====================================================================';
\echo ''

-- =====================================================================
-- SECTION 4: CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================================
\echo '🔗 Checking foreign key constraints...'
\echo ''

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public';
    
    IF constraint_count < 50 THEN
        RAISE WARNING '⚠️  Found only % foreign key constraints. Expected more. Some may be missing.', constraint_count;
    ELSE
        RAISE NOTICE '✅ Found % foreign key constraints', constraint_count;
    END IF;
END $$;

\echo ''
\echo '=====================================================================';
\echo ''

-- =====================================================================
-- SECTION 5: CHECK ASSETS TABLE MIGRATION STATE
-- =====================================================================
\echo '🖼️  Checking assets table migration state...'
\echo ''

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND column_name = 'uploadedById'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✅ Assets table correctly uses AppUser (uploadedById column exists)';
    ELSE
        RAISE WARNING '❌ Assets table still using old uploadedBy column - migration needed';
    END IF;
END $$;

\echo ''
\echo '=====================================================================';
\echo ''

-- =====================================================================
-- SECTION 6: DETAILED TABLE STRUCTURE CHECK
-- =====================================================================
\echo '📊 Detailed table structure check...'
\echo ''

-- Check users table structure
\echo '  Checking users table...';
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '  Checking AppUser table...';
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'AppUser' 
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '=====================================================================';
\echo ''
\echo '✅ Schema verification complete!';
\echo ''
\echo 'Next steps:';
\echo '  1. Review any warnings above';
\echo '  2. If issues found, run: npx prisma migrate deploy';
\echo '  3. If critical columns missing, check migration files';
\echo ''
