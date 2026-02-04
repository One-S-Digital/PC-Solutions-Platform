-- Quick check: Do the required tables exist?
-- Run this first before the full diagnostic

-- Check for tables (works on PostgreSQL)
SELECT 
    tablename as table_name,
    'EXISTS' as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'subscriptions', 'organizations', 'user_organizations', 'subscription_plans')
ORDER BY tablename;

-- If you see fewer than 5 tables, migrations need to be run:
-- cd api && npx prisma migrate deploy

-- Quick count of organizations by type
SELECT 
    type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE "isActive" = true) as active_count
FROM organizations
GROUP BY type
ORDER BY type;

-- Quick count of subscriptions by status
SELECT 
    status,
    COUNT(*) as count
FROM subscriptions
GROUP BY status
ORDER BY count DESC;

-- Organizations with subscriptions linked via organizationId
SELECT 
    o.type,
    COUNT(DISTINCT o.id) as orgs_with_subscription
FROM organizations o
JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
GROUP BY o.type;

-- Check if subscriptions are linked via userId but NOT organizationId
SELECT 
    'Subscriptions with userId only (potential issue)' as check_type,
    COUNT(*) as count
FROM subscriptions 
WHERE "userId" IS NOT NULL 
    AND "organizationId" IS NULL;
