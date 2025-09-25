# DBeaver PostgreSQL User Role Management Guide

## Overview
This guide explains how to access and modify user roles in your PostgreSQL database using DBeaver. Based on your schema, you have **two user tables**:

1. **`users`** - The original user table (still exists)
2. **`AppUser`** - The newer user table for role management (created in role system overhaul)

Both tables use the `UserRole` enum with the following values:
- `SUPER_ADMIN`
- `ADMIN`
- `FOUNDATION`
- `PRODUCT_SUPPLIER`
- `SERVICE_PROVIDER`
- `EDUCATOR`
- `PARENT`

**Important**: The `AppUser` table appears to be the primary table for role management, while `users` may be legacy. Always check both tables when managing user roles.

## Prerequisites
- DBeaver installed and configured
- Access to your PostgreSQL database
- Database connection details:
  - Host: `localhost` (or your database host)
  - Port: `5432`
  - Database: `pc_solutions_dev`
  - Username: `pc_solutions_user`
  - Password: `pc_solutions_password`

## Step 1: Connect to Your Database

### 1.1 Create New Connection
1. Open DBeaver
2. Click **Database** → **New Database Connection**
3. Select **PostgreSQL** from the list
4. Click **Next**

### 1.2 Configure Connection Settings
```
Server Host: localhost
Port: 5432
Database: pc_solutions_dev
Username: pc_solutions_user
Password: pc_solutions_password
```

### 1.3 Test Connection
1. Click **Test Connection** to verify settings
2. If successful, click **Finish** to save the connection

## Step 2: Access User Data

### 2.1 Navigate to User Tables
1. Expand your database connection in the Database Navigator
2. Navigate to: **pc_solutions_dev** → **Schemas** → **public** → **Tables**
3. You'll find both:
   - **`users`** - Original user table
   - **`AppUser`** - Newer role management table

### 2.2 View User Data
**For AppUser table (recommended):**
1. Right-click on the **`AppUser`** table
2. Select **View Data** or **Generate SQL** → **SELECT**
3. This shows users with their current roles

**For users table (legacy):**
1. Right-click on the **`users`** table
2. Select **View Data** or **Generate SQL** → **SELECT**
3. This shows the original user data

## Step 3: Query Users and Their Roles

### 3.1 Basic User Queries

**AppUser table (recommended):**
```sql
SELECT 
    id,
    "clerkUserId",
    role,
    "createdAt",
    "updatedAt"
FROM "AppUser"
ORDER BY "createdAt" DESC;
```

**Users table (legacy):**
```sql
SELECT 
    id,
    "clerkId",
    email,
    "firstName",
    "lastName",
    role,
    "isActive",
    "createdAt",
    "updatedAt"
FROM users
ORDER BY "createdAt" DESC;
```

### 3.2 Filter Users by Role

**AppUser table:**
```sql
-- Find all ADMIN users
SELECT * FROM "AppUser" WHERE role = 'ADMIN';

-- Find all FOUNDATION users
SELECT * FROM "AppUser" WHERE role = 'FOUNDATION';

-- Find all PARENT users
SELECT * FROM "AppUser" WHERE role = 'PARENT';
```

**Users table:**
```sql
-- Find all ADMIN users
SELECT * FROM users WHERE role = 'ADMIN';

-- Find all FOUNDATION users
SELECT * FROM users WHERE role = 'FOUNDATION';

-- Find all PARENT users
SELECT * FROM users WHERE role = 'PARENT';
```

### 3.3 Search for Specific User

**AppUser table:**
```sql
-- Search by Clerk User ID
SELECT * FROM "AppUser" WHERE "clerkUserId" = 'user_123456789';
```

**Users table:**
```sql
-- Search by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Search by Clerk ID
SELECT * FROM users WHERE "clerkId" = 'user_123456789';

-- Search by name
SELECT * FROM users 
WHERE "firstName" ILIKE '%john%' OR "lastName" ILIKE '%doe%';
```

## Step 4: Change User Roles

### 4.1 Update Single User Role

**AppUser table (recommended):**
```sql
-- Change user role to ADMIN
UPDATE "AppUser" 
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE "clerkUserId" = 'user_123456789';

-- Change user role to FOUNDATION
UPDATE "AppUser" 
SET role = 'FOUNDATION', "updatedAt" = NOW()
WHERE "clerkUserId" = 'user_123456789';

-- Change user role to EDUCATOR
UPDATE "AppUser" 
SET role = 'EDUCATOR', "updatedAt" = NOW()
WHERE id = 'user-uuid-here';
```

**Users table (legacy):**
```sql
-- Change user role to ADMIN
UPDATE users 
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE email = 'user@example.com';

-- Change user role to FOUNDATION
UPDATE users 
SET role = 'FOUNDATION', "updatedAt" = NOW()
WHERE "clerkId" = 'user_123456789';

-- Change user role to EDUCATOR
UPDATE users 
SET role = 'EDUCATOR', "updatedAt" = NOW()
WHERE id = 'user-uuid-here';
```

### 4.2 Bulk Role Updates

**AppUser table:**
```sql
-- Update multiple users to PARENT role
UPDATE "AppUser" 
SET role = 'PARENT', "updatedAt" = NOW()
WHERE "clerkUserId" IN ('user_1', 'user_2', 'user_3');

-- Update users based on conditions
UPDATE "AppUser" 
SET role = 'SERVICE_PROVIDER', "updatedAt" = NOW()
WHERE "createdAt" < '2024-01-01' AND role = 'PARENT';
```

**Users table:**
```sql
-- Update multiple users to PARENT role
UPDATE users 
SET role = 'PARENT', "updatedAt" = NOW()
WHERE email IN ('user1@example.com', 'user2@example.com');

-- Update users based on conditions
UPDATE users 
SET role = 'SERVICE_PROVIDER', "updatedAt" = NOW()
WHERE "createdAt" < '2024-01-01' AND role = 'PARENT';
```

### 4.3 Safe Role Update with Verification

**AppUser table:**
```sql
-- First, check what will be updated
SELECT id, "clerkUserId", role
FROM "AppUser" 
WHERE "clerkUserId" = 'user_123456789';

-- Then perform the update
UPDATE "AppUser" 
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE "clerkUserId" = 'user_123456789';

-- Verify the change
SELECT id, "clerkUserId", role, "updatedAt"
FROM "AppUser" 
WHERE "clerkUserId" = 'user_123456789';
```

**Users table:**
```sql
-- First, check what will be updated
SELECT id, email, role, "firstName", "lastName"
FROM users 
WHERE email = 'user@example.com';

-- Then perform the update
UPDATE users 
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE email = 'user@example.com';

-- Verify the change
SELECT id, email, role, "firstName", "lastName", "updatedAt"
FROM users 
WHERE email = 'user@example.com';
```

## Step 5: Using DBeaver's Visual Interface

### 5.1 Edit Data Directly

**For AppUser table (recommended):**
1. Right-click on the **`AppUser`** table
2. Select **View Data**
3. In the data view, click on the **role** column for the user you want to modify
4. Select the new role from the dropdown
5. Press **Ctrl+S** or click the **Save** button to commit changes

**For users table (legacy):**
1. Right-click on the **`users`** table
2. Select **View Data**
3. In the data view, click on the **role** column for the user you want to modify
4. Select the new role from the dropdown
5. Press **Ctrl+S** or click the **Save** button to commit changes

### 5.2 Using SQL Editor
1. Right-click on your database connection
2. Select **SQL Editor** → **New SQL Script**
3. Type your UPDATE query
4. Press **Ctrl+Enter** or click **Execute** to run the query

## Step 6: Advanced Role Management Queries

### 6.1 Role Statistics

**AppUser table:**
```sql
-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count
FROM "AppUser" 
GROUP BY role
ORDER BY user_count DESC;
```

**Users table:**
```sql
-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_count
FROM users 
GROUP BY role
ORDER BY user_count DESC;
```

### 6.2 Recent Role Changes

**AppUser table:**
```sql
-- Find users updated in the last 7 days
SELECT 
    id,
    "clerkUserId",
    role,
    "updatedAt"
FROM "AppUser" 
WHERE "updatedAt" >= NOW() - INTERVAL '7 days'
ORDER BY "updatedAt" DESC;
```

**Users table:**
```sql
-- Find users updated in the last 7 days
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    role,
    "updatedAt"
FROM users 
WHERE "updatedAt" >= NOW() - INTERVAL '7 days'
ORDER BY "updatedAt" DESC;
```

### 6.3 Cross-Table User Analysis
```sql
-- Compare users between both tables
SELECT 
    u."clerkId",
    u.email,
    u.role as users_role,
    au.role as appuser_role,
    CASE 
        WHEN u.role = au.role THEN 'MATCH'
        ELSE 'MISMATCH'
    END as role_status
FROM users u
LEFT JOIN "AppUser" au ON u."clerkId" = au."clerkUserId"
ORDER BY role_status DESC, u.email;
```

### 6.4 User Organization Roles
```sql
-- Check user roles in organizations (from users table)
SELECT 
    u.email,
    u.role as user_role,
    o.name as organization_name,
    uo.role as organization_role
FROM users u
LEFT JOIN user_organizations uo ON u.id = uo."userId"
LEFT JOIN organizations o ON uo."organizationId" = o.id
ORDER BY u.email;
```

## Step 7: Best Practices and Safety

### 7.1 Always Backup Before Changes

**AppUser table:**
```sql
-- Create a backup of user roles before bulk changes
CREATE TABLE appuser_role_backup AS 
SELECT id, "clerkUserId", role, "updatedAt" 
FROM "AppUser";
```

**Users table:**
```sql
-- Create a backup of user roles before bulk changes
CREATE TABLE users_role_backup AS 
SELECT id, email, role, "updatedAt" 
FROM users;
```

### 7.2 Use Transactions for Safety
```sql
BEGIN;

-- Your update queries here (AppUser table)
UPDATE "AppUser" SET role = 'ADMIN' WHERE "clerkUserId" = 'user_123456789';

-- Check the results
SELECT * FROM "AppUser" WHERE "clerkUserId" = 'user_123456789';

-- If everything looks good, commit
COMMIT;

-- If something is wrong, rollback
-- ROLLBACK;
```

### 7.3 Validate Role Changes

**AppUser table:**
```sql
-- Check for invalid role assignments
SELECT * FROM "AppUser" 
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT');
```

**Users table:**
```sql
-- Check for invalid role assignments
SELECT * FROM users 
WHERE role NOT IN ('SUPER_ADMIN', 'ADMIN', 'FOUNDATION', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'EDUCATOR', 'PARENT');
```

## Step 8: Troubleshooting

### 8.1 Common Issues

**Issue: Permission Denied**
- Ensure your database user has UPDATE permissions on the users table
- Check if you're connected with the correct user account

**Issue: Role Not Found**
- Verify the role value matches exactly (case-sensitive)
- Check the UserRole enum values in your schema

**Issue: Connection Failed**
- Verify database is running: `docker-compose ps`
- Check connection parameters
- Ensure firewall allows port 5432

### 8.2 Useful Diagnostic Queries
```sql
-- Check current database user
SELECT current_user;

-- Check table permissions
SELECT * FROM information_schema.table_privileges 
WHERE table_name IN ('users', 'AppUser');

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('users', 'AppUser');

-- Check AppUserRoleHistory for audit trail
SELECT 
    auh."userId",
    au."clerkUserId",
    auh."previousRole",
    auh."newRole",
    auh."changedBy",
    auh."changedAt"
FROM "AppUserRoleHistory" auh
JOIN "AppUser" au ON auh."userId" = au.id
ORDER BY auh."changedAt" DESC
LIMIT 20;
```

## Step 9: Monitoring and Auditing

### 9.1 Track Role Changes

**AppUserRoleHistory table (already exists):**
```sql
-- View recent role changes
SELECT 
    auh."userId",
    au."clerkUserId",
    auh."previousRole",
    auh."newRole",
    auh."changedBy",
    auh."reason",
    auh."changedAt"
FROM "AppUserRoleHistory" auh
JOIN "AppUser" au ON auh."userId" = au.id
ORDER BY auh."changedAt" DESC
LIMIT 20;
```

**Create audit log for users table (if needed):**
```sql
-- Create a simple audit log for users table
CREATE TABLE IF NOT EXISTS users_role_audit (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    old_role VARCHAR(50),
    new_role VARCHAR(50),
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger function for automatic logging
CREATE OR REPLACE FUNCTION log_users_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role != NEW.role THEN
        INSERT INTO users_role_audit (user_id, old_role, new_role, changed_by)
        VALUES (NEW.id, OLD.role, NEW.role, current_user);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER users_role_change_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_users_role_change();
```

### 9.2 View Audit Logs
```sql
-- Check recent role changes in users table
SELECT 
    u.email,
    ura.old_role,
    ura.new_role,
    ura.changed_by,
    ura.changed_at
FROM users_role_audit ura
JOIN users u ON ura.user_id = u.id
ORDER BY ura.changed_at DESC
LIMIT 20;
```

## Step 10: Quick Reference Commands

### Essential SQL Commands

**AppUser table (recommended):**
```sql
-- List all users
SELECT id, "clerkUserId", role FROM "AppUser";

-- Find user by Clerk ID
SELECT * FROM "AppUser" WHERE "clerkUserId" = 'user_123456789';

-- Change role to ADMIN
UPDATE "AppUser" SET role = 'ADMIN' WHERE "clerkUserId" = 'user_123456789';

-- Change role to PARENT
UPDATE "AppUser" SET role = 'PARENT' WHERE "clerkUserId" = 'user_123456789';

-- Count by role
SELECT role, COUNT(*) FROM "AppUser" GROUP BY role;

-- Recent updates
SELECT "clerkUserId", role, "updatedAt" FROM "AppUser" ORDER BY "updatedAt" DESC LIMIT 10;
```

**Users table (legacy):**
```sql
-- List all users
SELECT id, email, "firstName", "lastName", role FROM users;

-- Find user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- Change role to ADMIN
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';

-- Change role to PARENT
UPDATE users SET role = 'PARENT' WHERE email = 'user@example.com';

-- Count by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Recent updates
SELECT email, role, "updatedAt" FROM users ORDER BY "updatedAt" DESC LIMIT 10;
```

## Security Considerations

1. **Always use WHERE clauses** to avoid updating all users
2. **Test queries** on a small subset first
3. **Use transactions** for multiple related changes
4. **Keep backups** before bulk operations
5. **Monitor changes** through audit logs
6. **Limit access** to role management functions

## Conclusion

This guide provides comprehensive instructions for managing user roles in your PostgreSQL database using DBeaver. Always exercise caution when modifying user roles, especially in production environments, and consider implementing proper audit trails for compliance and security purposes.

For additional help, refer to:
- [DBeaver Documentation](https://dbeaver.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Your project's specific database schema and requirements