-- Fix Duplicate Subscriptions Script
-- WARNING: Review the output of check-subscription-data-integrity.sql before running this!
-- This script will cancel duplicate subscriptions, keeping only the most recent ACTIVE or TRIAL one

-- Step 1: Identify organizations with problematic duplicates
-- (Run this first to see what will be affected)
WITH ranked_subscriptions AS (
    SELECT 
        s.id,
        s."organizationId",
        s.status,
        s."createdAt",
        o.name as org_name,
        ROW_NUMBER() OVER (
            PARTITION BY s."organizationId" 
            ORDER BY 
                CASE 
                    WHEN s.status IN ('ACTIVE', 'TRIAL') THEN 0
                    ELSE 1
                END,
                s."createdAt" DESC
        ) as priority_rank
    FROM subscriptions s
    JOIN organizations o ON o.id = s."organizationId"
    WHERE s."organizationId" IS NOT NULL
)
SELECT 
    org_name,
    "organizationId",
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE priority_rank = 1) as subscriptions_to_keep,
    COUNT(*) FILTER (WHERE priority_rank > 1) as subscriptions_to_cancel
FROM ranked_subscriptions
GROUP BY org_name, "organizationId"
HAVING COUNT(*) > 1
ORDER BY total_subscriptions DESC;

-- Step 2: Cancel duplicate subscriptions (UNCOMMENT TO RUN)
-- This keeps the most recent ACTIVE/TRIAL subscription, or the most recent one if none are active
/*
WITH ranked_subscriptions AS (
    SELECT 
        s.id,
        s."organizationId",
        s.status,
        ROW_NUMBER() OVER (
            PARTITION BY s."organizationId" 
            ORDER BY 
                CASE 
                    WHEN s.status IN ('ACTIVE', 'TRIAL') THEN 0
                    ELSE 1
                END,
                s."createdAt" DESC
        ) as priority_rank
    FROM subscriptions s
    WHERE s."organizationId" IS NOT NULL
        AND s.status NOT IN ('CANCELLED', 'EXPIRED')
)
UPDATE subscriptions
SET 
    status = 'CANCELLED',
    "canceledAt" = NOW(),
    "cancellationReason" = 'Duplicate subscription - auto-cancelled by data integrity script',
    "updatedAt" = NOW()
WHERE id IN (
    SELECT id 
    FROM ranked_subscriptions 
    WHERE priority_rank > 1
)
RETURNING id, "organizationId", status;
*/

-- Step 3: Verify the fix (run after Step 2)
/*
SELECT 
    o.name as org_name,
    s.status,
    s."currentPeriodStart",
    s."currentPeriodEnd",
    sp.name as plan_name
FROM subscriptions s
JOIN organizations o ON o.id = s."organizationId"
JOIN subscription_plans sp ON sp.id = s."planId"
WHERE s.status IN ('ACTIVE', 'TRIAL')
ORDER BY o.name;
*/
