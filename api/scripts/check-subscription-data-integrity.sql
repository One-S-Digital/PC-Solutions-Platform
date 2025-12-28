-- Subscription Data Integrity Check
-- This script helps identify potential issues with subscription data
-- Run this to diagnose subscription paywall issues

-- 1. Organizations with multiple subscriptions (potential issue)
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    COUNT(s.id) as subscription_count,
    STRING_AGG(DISTINCT s.status::text, ', ') as statuses
FROM organizations o
LEFT JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type = 'FOUNDATION'
GROUP BY o.id, o.name, o.type
HAVING COUNT(s.id) > 1
ORDER BY subscription_count DESC;

-- 2. Organizations with ACTIVE subscriptions but also other statuses
SELECT 
    o.id as org_id,
    o.name as org_name,
    s.id as subscription_id,
    s.status,
    s."createdAt",
    s."currentPeriodStart",
    s."currentPeriodEnd",
    sp.name as plan_name,
    sp.code as plan_code
FROM organizations o
JOIN subscriptions s ON s."organizationId" = o.id
JOIN subscription_plans sp ON sp.id = s."planId"
WHERE o.id IN (
    SELECT "organizationId" 
    FROM subscriptions 
    WHERE status IN ('ACTIVE', 'TRIAL')
    GROUP BY "organizationId"
)
ORDER BY o.name, s."createdAt" DESC;

-- 3. Find organizations that should have access but might be seeing paywall
-- (Have ACTIVE subscription but also newer PENDING/INACTIVE subscriptions)
WITH org_subscriptions AS (
    SELECT 
        o.id as org_id,
        o.name as org_name,
        s.id as subscription_id,
        s.status,
        s."createdAt",
        ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY s."createdAt" DESC) as recency_rank,
        (s.status IN ('ACTIVE', 'TRIAL')) as is_active
    FROM organizations o
    JOIN subscriptions s ON s."organizationId" = o.id
    WHERE o.type = 'FOUNDATION'
)
SELECT 
    org_id,
    org_name,
    MAX(CASE WHEN recency_rank = 1 THEN status END) as most_recent_status,
    MAX(CASE WHEN recency_rank = 1 THEN is_active END) as most_recent_is_active,
    MAX(CASE WHEN is_active THEN 'YES' ELSE 'NO' END) as has_active_subscription,
    COUNT(*) as total_subscriptions
FROM org_subscriptions
GROUP BY org_id, org_name
HAVING 
    MAX(CASE WHEN recency_rank = 1 THEN is_active END) = false
    AND MAX(CASE WHEN is_active THEN 'YES' ELSE 'NO' END) = 'YES'
ORDER BY org_name;

-- 4. Subscription status distribution
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM subscriptions
GROUP BY status
ORDER BY count DESC;

-- 5. Organizations without any subscription
SELECT 
    o.id,
    o.name,
    o.type,
    o."createdAt"
FROM organizations o
LEFT JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type = 'FOUNDATION'
    AND s.id IS NULL
ORDER BY o."createdAt" DESC;

-- 6. Subscription requests that were activated but subscription status is not ACTIVE
SELECT 
    sr.id as request_id,
    sr.status as request_status,
    sr."contactEmail",
    sr."subscriptionId",
    s.status as subscription_status,
    s."currentPeriodEnd",
    o.name as org_name
FROM subscription_requests sr
LEFT JOIN subscriptions s ON s.id = sr."subscriptionId"
LEFT JOIN organizations o ON o.id = sr."organizationId"
WHERE sr.status = 'ACTIVATED'
    AND (s.status IS NULL OR s.status NOT IN ('ACTIVE', 'TRIAL'))
ORDER BY sr."createdAt" DESC;

-- 7. Active subscriptions with expired periods
SELECT 
    s.id,
    o.name as org_name,
    s.status,
    s."currentPeriodEnd",
    sp.name as plan_name,
    EXTRACT(DAY FROM NOW() - s."currentPeriodEnd") as days_expired
FROM subscriptions s
LEFT JOIN organizations o ON o.id = s."organizationId"
JOIN subscription_plans sp ON sp.id = s."planId"
WHERE s.status IN ('ACTIVE', 'TRIAL')
    AND s."currentPeriodEnd" < NOW()
ORDER BY s."currentPeriodEnd" DESC;

-- 8. Summary report
SELECT 
    'Total Foundations' as metric,
    COUNT(*) as value
FROM organizations WHERE type = 'FOUNDATION'
UNION ALL
SELECT 
    'Foundations with Subscriptions',
    COUNT(DISTINCT "organizationId")
FROM subscriptions WHERE "organizationId" IS NOT NULL
UNION ALL
SELECT 
    'Active Subscriptions',
    COUNT(*)
FROM subscriptions WHERE status = 'ACTIVE'
UNION ALL
SELECT 
    'Trial Subscriptions',
    COUNT(*)
FROM subscriptions WHERE status = 'TRIAL'
UNION ALL
SELECT 
    'Pending Subscriptions',
    COUNT(*)
FROM subscriptions WHERE status = 'PENDING'
UNION ALL
SELECT 
    'Cancelled Subscriptions',
    COUNT(*)
FROM subscriptions WHERE status = 'CANCELLED'
UNION ALL
SELECT 
    'Foundations with Multiple Subscriptions',
    COUNT(*)
FROM (
    SELECT "organizationId"
    FROM subscriptions
    WHERE "organizationId" IS NOT NULL
    GROUP BY "organizationId"
    HAVING COUNT(*) > 1
) multi;
