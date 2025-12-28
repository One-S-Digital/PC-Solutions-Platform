-- Fix Subscription User IDs Script
-- 
-- ROOT CAUSE: Admin dashboard was creating subscriptions with AppUser.id instead of User.id
-- The subscription table's userId column references User.id, not AppUser.id
-- This causes /subscriptions/me lookup to fail because it queries by User.id (profileUserId)
--
-- WARNING: Review carefully before running in production!

-- ============================================
-- STEP 1: DIAGNOSTIC - Find subscriptions with wrong user IDs
-- ============================================

-- Find subscriptions where userId matches an AppUser.id but NOT a User.id
-- These are the broken subscriptions
SELECT 
    s.id as subscription_id,
    s."userId" as subscription_user_id,
    s."organizationId" as subscription_org_id,
    s.status,
    s."createdAt",
    au.id as app_user_id,
    au."clerkId",
    au.email as app_user_email,
    au.role,
    u.id as correct_user_id,
    u.email as user_email,
    uo."organizationId" as user_org_id,
    o.name as org_name
FROM subscriptions s
LEFT JOIN app_users au ON au.id = s."userId"  -- Check if userId is actually an AppUser.id
LEFT JOIN users u ON u."clerkId" = au."clerkId"  -- Find the correct User.id via clerkId
LEFT JOIN user_organizations uo ON uo."userId" = u.id
LEFT JOIN organizations o ON o.id = uo."organizationId"
WHERE s."userId" IS NOT NULL
    AND au.id IS NOT NULL  -- userId matches an AppUser.id
    AND u.id IS NOT NULL   -- User exists
    AND s."userId" != u.id -- But subscription.userId != User.id (indicates wrong ID was used)
ORDER BY s."createdAt" DESC;

-- ============================================
-- STEP 2: DIAGNOSTIC - Count broken subscriptions
-- ============================================
SELECT 
    COUNT(*) as total_broken_subscriptions,
    COUNT(DISTINCT au.id) as unique_app_users_affected,
    COUNT(DISTINCT au.role) as roles_affected
FROM subscriptions s
LEFT JOIN app_users au ON au.id = s."userId"
LEFT JOIN users u ON u."clerkId" = au."clerkId"
WHERE s."userId" IS NOT NULL
    AND au.id IS NOT NULL
    AND u.id IS NOT NULL
    AND s."userId" != u.id;

-- ============================================
-- STEP 3: DIAGNOSTIC - Show subscriptions that have no organizationId
-- (These are harder to look up without correct userId)
-- ============================================
SELECT 
    s.id as subscription_id,
    s."userId",
    s."organizationId",
    s.status,
    sp.name as plan_name,
    au.role,
    au.email
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s."planId"
LEFT JOIN app_users au ON au.id = s."userId"
WHERE s."organizationId" IS NULL
    AND s."userId" IS NOT NULL
    AND au.id IS NOT NULL  -- userId is an AppUser.id (indicating wrong ID)
ORDER BY s."createdAt" DESC;

-- ============================================
-- STEP 4: FIX - Update subscriptions to use correct User.id and add organizationId
-- UNCOMMENT TO RUN - Review diagnostics first!
-- ============================================
/*
WITH corrections AS (
    SELECT 
        s.id as subscription_id,
        s."userId" as old_user_id,
        u.id as new_user_id,
        uo."organizationId" as user_org_id,
        s."organizationId" as current_org_id
    FROM subscriptions s
    JOIN app_users au ON au.id = s."userId"  -- Old userId matches AppUser.id
    JOIN users u ON u."clerkId" = au."clerkId"  -- Find correct User.id
    LEFT JOIN user_organizations uo ON uo."userId" = u.id  -- Get user's org
    WHERE s."userId" IS NOT NULL
        AND s."userId" != u.id  -- Subscription has wrong userId
)
UPDATE subscriptions s
SET 
    "userId" = c.new_user_id,
    "organizationId" = COALESCE(s."organizationId", c.user_org_id),
    "updatedAt" = NOW()
FROM corrections c
WHERE s.id = c.subscription_id
RETURNING 
    s.id, 
    c.old_user_id as old_user_id, 
    s."userId" as new_user_id, 
    s."organizationId" as org_id,
    s.status;
*/

-- ============================================
-- STEP 5: VERIFY - Check subscriptions after fix
-- ============================================
/*
SELECT 
    s.id,
    s."userId",
    s."organizationId",
    s.status,
    u.email,
    o.name as org_name
FROM subscriptions s
LEFT JOIN users u ON u.id = s."userId"
LEFT JOIN organizations o ON o.id = s."organizationId"
WHERE s.status IN ('ACTIVE', 'TRIAL')
ORDER BY s."createdAt" DESC;
*/

-- ============================================
-- ADDITIONAL: Find orphaned subscriptions (userId doesn't exist in either table)
-- ============================================
SELECT 
    s.id,
    s."userId",
    s."organizationId",
    s.status,
    s."createdAt"
FROM subscriptions s
LEFT JOIN users u ON u.id = s."userId"
LEFT JOIN app_users au ON au.id = s."userId"
WHERE s."userId" IS NOT NULL
    AND u.id IS NULL
    AND au.id IS NULL
ORDER BY s."createdAt" DESC;
