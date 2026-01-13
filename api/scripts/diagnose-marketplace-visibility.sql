-- Marketplace Visibility Diagnostic Script
-- This script helps identify why Product Suppliers and Service Providers might not be visible
-- Run this to diagnose marketplace visibility issues for vendors

-- ============================================
-- ISSUE 1: Subscriptions linked to userId instead of organizationId
-- ============================================
-- The marketplace query checks organizations.subscriptions which only finds
-- subscriptions where organizationId is set. If subscription is linked via
-- userId only, it won't be found!

SELECT 
    'Subscriptions with userId but NO organizationId (PROBLEM!)' as issue,
    s.id as subscription_id,
    s.status,
    s."currentPeriodEnd",
    s."userId",
    s."organizationId",
    u.email as user_email,
    u.role as user_role,
    uo."organizationId" as user_org_id,
    o.name as org_name,
    o.type as org_type
FROM subscriptions s
LEFT JOIN users u ON u.id = s."userId"
LEFT JOIN user_organizations uo ON uo."userId" = u.id
LEFT JOIN organizations o ON o.id = uo."organizationId"
WHERE s."organizationId" IS NULL
    AND s."userId" IS NOT NULL
    AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
ORDER BY s."createdAt" DESC;

-- ============================================
-- ISSUE 2: Suppliers/Providers without ANY subscription
-- ============================================
SELECT 
    'Suppliers/Providers WITHOUT any subscription' as issue,
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    o."isActive",
    o."createdAt"
FROM organizations o
LEFT JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
    AND s.id IS NULL
ORDER BY o."createdAt" DESC;

-- ============================================
-- ISSUE 3: Suppliers/Providers with subscriptions but WRONG status
-- ============================================
SELECT 
    'Suppliers/Providers with subscription but WRONG status' as issue,
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    s.id as subscription_id,
    s.status as subscription_status,
    s."currentPeriodEnd",
    s.tier
FROM organizations o
JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
    AND s.status NOT IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
ORDER BY o.name;

-- ============================================
-- ISSUE 4: Suppliers/Providers with EXPIRED subscriptions
-- ============================================
SELECT 
    'Suppliers/Providers with EXPIRED subscription dates' as issue,
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    s.id as subscription_id,
    s.status,
    s."currentPeriodEnd",
    s."trialEnd",
    s."gracePeriodEnd",
    CASE 
        WHEN s.status = 'ACTIVE' AND s."currentPeriodEnd" < NOW() THEN 'currentPeriodEnd expired'
        WHEN s.status = 'TRIAL' AND s."trialEnd" < NOW() THEN 'trialEnd expired'
        WHEN s.status = 'GRACE_PERIOD' AND s."gracePeriodEnd" < NOW() THEN 'gracePeriodEnd expired'
        ELSE 'OK'
    END as expiry_issue
FROM organizations o
JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
    AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
    AND (
        (s.status = 'ACTIVE' AND s."currentPeriodEnd" IS NOT NULL AND s."currentPeriodEnd" < NOW())
        OR (s.status = 'TRIAL' AND s."trialEnd" IS NOT NULL AND s."trialEnd" < NOW())
        OR (s.status = 'GRACE_PERIOD' AND s."gracePeriodEnd" IS NOT NULL AND s."gracePeriodEnd" < NOW())
    )
ORDER BY o.name;

-- ============================================
-- ISSUE 5: Organization isActive = false
-- ============================================
SELECT 
    'Suppliers/Providers with isActive = false' as issue,
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    o."isActive",
    COUNT(s.id) as subscription_count
FROM organizations o
LEFT JOIN subscriptions s ON s."organizationId" = o.id AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
    AND o."isActive" = false
GROUP BY o.id, o.name, o.type, o."isActive"
ORDER BY o.name;

-- ============================================
-- SUMMARY: All Suppliers/Providers and their visibility status
-- ============================================
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.type as org_type,
    o."isActive" as org_is_active,
    s.id as subscription_id,
    s.status as subscription_status,
    s."currentPeriodEnd",
    s."trialEnd",
    s."gracePeriodEnd",
    CASE 
        WHEN o."isActive" = false THEN 'HIDDEN: org isActive=false'
        WHEN s.id IS NULL THEN 'HIDDEN: no subscription'
        WHEN s.status NOT IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD') THEN 'HIDDEN: subscription status not valid'
        WHEN s.status = 'ACTIVE' AND s."currentPeriodEnd" IS NOT NULL AND s."currentPeriodEnd" < NOW() THEN 'HIDDEN: currentPeriodEnd expired'
        WHEN s.status = 'TRIAL' AND s."trialEnd" IS NOT NULL AND s."trialEnd" < NOW() THEN 'HIDDEN: trialEnd expired'
        WHEN s.status = 'GRACE_PERIOD' AND s."gracePeriodEnd" IS NOT NULL AND s."gracePeriodEnd" < NOW() THEN 'HIDDEN: gracePeriodEnd expired'
        ELSE 'VISIBLE'
    END as visibility_status
FROM organizations o
LEFT JOIN subscriptions s ON s."organizationId" = o.id
WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
ORDER BY 
    CASE 
        WHEN o."isActive" = false THEN 'HIDDEN: org isActive=false'
        WHEN s.id IS NULL THEN 'HIDDEN: no subscription'
        WHEN s.status NOT IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD') THEN 'HIDDEN: subscription status not valid'
        WHEN s.status = 'ACTIVE' AND s."currentPeriodEnd" IS NOT NULL AND s."currentPeriodEnd" < NOW() THEN 'HIDDEN: currentPeriodEnd expired'
        WHEN s.status = 'TRIAL' AND s."trialEnd" IS NOT NULL AND s."trialEnd" < NOW() THEN 'HIDDEN: trialEnd expired'
        WHEN s.status = 'GRACE_PERIOD' AND s."gracePeriodEnd" IS NOT NULL AND s."gracePeriodEnd" < NOW() THEN 'HIDDEN: gracePeriodEnd expired'
        ELSE 'VISIBLE'
    END,
    o.name;

-- ============================================
-- STATS: Count by visibility status
-- ============================================
SELECT 
    visibility_status,
    COUNT(*) as count
FROM (
    SELECT 
        o.id,
        CASE 
            WHEN o."isActive" = false THEN 'HIDDEN: org isActive=false'
            WHEN s.id IS NULL THEN 'HIDDEN: no subscription linked to org'
            WHEN s.status NOT IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD') THEN 'HIDDEN: subscription status=' || s.status
            WHEN s.status = 'ACTIVE' AND s."currentPeriodEnd" IS NOT NULL AND s."currentPeriodEnd" < NOW() THEN 'HIDDEN: currentPeriodEnd expired'
            WHEN s.status = 'TRIAL' AND s."trialEnd" IS NOT NULL AND s."trialEnd" < NOW() THEN 'HIDDEN: trialEnd expired'
            WHEN s.status = 'GRACE_PERIOD' AND s."gracePeriodEnd" IS NOT NULL AND s."gracePeriodEnd" < NOW() THEN 'HIDDEN: gracePeriodEnd expired'
            ELSE 'VISIBLE'
        END as visibility_status
    FROM organizations o
    LEFT JOIN subscriptions s ON s."organizationId" = o.id
    WHERE o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER')
) sub
GROUP BY visibility_status
ORDER BY count DESC;

-- ============================================
-- FIX SUGGESTION: Link subscriptions to organizations
-- ============================================
-- If you find subscriptions that have userId but no organizationId,
-- you can link them by finding the user's organization and updating:
/*
UPDATE subscriptions s
SET "organizationId" = uo."organizationId"
FROM user_organizations uo
WHERE s."userId" = uo."userId"
    AND s."organizationId" IS NULL
    AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD');
*/

-- Preview what would be updated:
SELECT 
    'Would link subscription to organization' as action,
    s.id as subscription_id,
    s.status,
    s."userId",
    uo."organizationId" as new_organization_id,
    o.name as org_name,
    o.type as org_type
FROM subscriptions s
JOIN user_organizations uo ON uo."userId" = s."userId"
JOIN organizations o ON o.id = uo."organizationId"
WHERE s."organizationId" IS NULL
    AND s.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
    AND o.type IN ('PRODUCT_SUPPLIER', 'SERVICE_PROVIDER');
