-- ========================================
-- Database Schema Verification Queries
-- ========================================

-- 1. LIST ALL TABLES
-- Should show: AppUser, User, Organization, Asset, Product, Job, Course, etc.
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. CHECK APPUSER TABLE STRUCTURE
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'AppUser'
ORDER BY ordinal_position;

-- 3. CHECK USER TABLE STRUCTURE  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'User'
ORDER BY ordinal_position;

-- 4. CHECK IF CRITICAL TABLES EXIST
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AppUser') 
    THEN '✅' ELSE '❌' END as "AppUser",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') 
    THEN '✅' ELSE '❌' END as "User",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Organization') 
    THEN '✅' ELSE '❌' END as "Organization",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Asset') 
    THEN '✅' ELSE '❌' END as "Asset",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Product') 
    THEN '✅' ELSE '❌' END as "Product",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Job') 
    THEN '✅' ELSE '❌' END as "Job",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Course') 
    THEN '✅' ELSE '❌' END as "Course",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations') 
    THEN '✅' ELSE '❌' END as "Migrations";

-- 5. CHECK ENUMS (TYPES) EXIST
SELECT 
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('UserRole', 'OrganizationType', 'SubscriptionStatus', 'JobStatus')
GROUP BY typname
ORDER BY typname;

-- 6. COUNT RECORDS IN KEY TABLES
SELECT 
  (SELECT COUNT(*) FROM "AppUser") as "AppUser_count",
  (SELECT COUNT(*) FROM "User") as "User_count",
  (SELECT COUNT(*) FROM "Organization") as "Organization_count",
  (SELECT COUNT(*) FROM "Asset") as "Asset_count";

-- 7. CHECK MIGRATIONS APPLIED
SELECT * 
FROM "_prisma_migrations"
ORDER BY finished_at DESC
LIMIT 10;

-- 8. CHECK FOR MISSING COLUMNS IN APPUSER
-- Expected columns: id, clerkId, email, role, createdAt, updatedAt
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'id'
  ) THEN '✅ id' ELSE '❌ id missing' END as col_id,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'clerkId'
  ) THEN '✅ clerkId' ELSE '❌ clerkId missing' END as col_clerkId,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'email'
  ) THEN '✅ email' ELSE '❌ email missing' END as col_email,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'role'
  ) THEN '✅ role' ELSE '❌ role missing' END as col_role,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'createdAt'
  ) THEN '✅ createdAt' ELSE '❌ createdAt missing' END as col_createdAt,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AppUser' AND column_name = 'updatedAt'
  ) THEN '✅ updatedAt' ELSE '❌ updatedAt missing' END as col_updatedAt;

-- 9. CHECK USER ROLE ENUM VALUES
SELECT enumlabel as "Available UserRole Values"
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'UserRole'
ORDER BY e.enumsortorder;

-- 10. FIND YOUR USER
SELECT id, "clerkId", email, role, "createdAt", "updatedAt"
FROM "AppUser"
WHERE "clerkId" = 'user_3294hGWOgY28Bu8V8P8kPdpA6NB';
