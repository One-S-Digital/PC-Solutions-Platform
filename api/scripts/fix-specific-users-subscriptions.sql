-- Fix Subscriptions for Specific Users
-- Run in DBeaver against the production database
-- 
-- Users to fix:
-- - dsmvalerie@gmail.com
-- - xobomir798@lawior.com

-- ============================================
-- STEP 1: DIAGNOSTIC - Find the broken subscriptions for these users
-- ============================================
SELECT 
    'BEFORE FIX' as stage,
    s.id as subscription_id,
    s."userId" as current_user_id,
    s."organizationId" as current_org_id,
    s.status,
    s.tier,
    sp.name as plan_name,
    au.id as app_user_id,
    au.email as app_user_email,
    au.role,
    u.id as correct_user_id,
    u.email as user_email,
    uo."organizationId" as user_org_id,
    o.name as org_name
FROM subscriptions s
JOIN app_users au ON au.id = s."userId"  -- Current userId is an AppUser.id
JOIN users u ON u."clerkId" = au."clerkId"  -- Find correct User.id via clerkId
LEFT JOIN user_organizations uo ON uo."userId" = u.id
LEFT JOIN organizations o ON o.id = uo."organizationId"
LEFT JOIN subscription_plans sp ON sp.id = s."planId"
WHERE au.email IN ('dsmvalerie@gmail.com', 'xobomir798@lawior.com')
ORDER BY au.email;

-- ============================================
-- STEP 2: FIX - Update the subscriptions
-- This updates userId to correct User.id and adds organizationId
-- ============================================
WITH user_mapping AS (
    SELECT 
        au.id as app_user_id,
        au.email,
        au."clerkId",
        u.id as correct_user_id,
        uo."organizationId" as user_org_id
    FROM app_users au
    JOIN users u ON u."clerkId" = au."clerkId"
    LEFT JOIN user_organizations uo ON uo."userId" = u.id
    WHERE au.email IN ('dsmvalerie@gmail.com', 'xobomir798@lawior.com')
),
subscriptions_to_fix AS (
    SELECT 
        s.id as subscription_id,
        s."userId" as old_user_id,
        um.correct_user_id as new_user_id,
        um.user_org_id,
        um.email
    FROM subscriptions s
    JOIN user_mapping um ON um.app_user_id = s."userId"
)
UPDATE subscriptions s
SET 
    "userId" = stf.new_user_id,
    "organizationId" = COALESCE(s."organizationId", stf.user_org_id),
    "updatedAt" = NOW()
FROM subscriptions_to_fix stf
WHERE s.id = stf.subscription_id
RETURNING 
    s.id as subscription_id,
    stf.old_user_id,
    s."userId" as new_user_id,
    s."organizationId",
    s.status,
    stf.email;

-- ============================================
-- STEP 3: VERIFY - Check the subscriptions are now correct
-- ============================================
SELECT 
    'AFTER FIX' as stage,
    s.id as subscription_id,
    s."userId",
    s."organizationId",
    s.status,
    s.tier,
    sp.name as plan_name,
    u.email,
    o.name as org_name
FROM subscriptions s
JOIN users u ON u.id = s."userId"
LEFT JOIN organizations o ON o.id = s."organizationId"
LEFT JOIN subscription_plans sp ON sp.id = s."planId"
WHERE u.email IN ('dsmvalerie@gmail.com', 'xobomir798@lawior.com')
ORDER BY u.email;
