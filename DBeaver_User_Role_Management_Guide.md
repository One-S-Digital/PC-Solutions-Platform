# DBeaver PostgreSQL User Role Management Guide

## Overview
This guide explains how to access and modify user roles in your PostgreSQL database using DBeaver. Based on your schema, users have roles defined by the `UserRole` enum with the following values:
- `SUPER_ADMIN`
- `ADMIN`
- `FOUNDATION`
- `PRODUCT_SUPPLIER`
- `SERVICE_PROVIDER`
- `EDUCATOR`
- `PARENT`

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

### 2.1 Navigate to Users Table
1. Expand your database connection in the Database Navigator
2. Navigate to: **pc_solutions_dev** → **Schemas** → **public** → **Tables**
3. Find and expand the **users** table

### 2.2 View User Data
1. Right-click on the **users** table
2. Select **View Data** or **Generate SQL** → **SELECT**
3. This will show all users with their current roles

## Step 3: Query Users and Their Roles

### 3.1 Basic User Query
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
```sql
-- Find all ADMIN users
SELECT * FROM users WHERE role = 'ADMIN';

-- Find all FOUNDATION users
SELECT * FROM users WHERE role = 'FOUNDATION';

-- Find all PARENT users
SELECT * FROM users WHERE role = 'PARENT';
```

### 3.3 Search for Specific User
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
1. Right-click on the **users** table
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

### 6.3 User Organization Roles
```sql
-- Check user roles in organizations
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
```sql
-- Create a backup of user roles before bulk changes
CREATE TABLE users_role_backup AS 
SELECT id, email, role, "updatedAt" 
FROM users;
```

### 7.2 Use Transactions for Safety
```sql
BEGIN;

-- Your update queries here
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';

-- Check the results
SELECT * FROM users WHERE email = 'user@example.com';

-- If everything looks good, commit
COMMIT;

-- If something is wrong, rollback
-- ROLLBACK;
```

### 7.3 Validate Role Changes
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
WHERE table_name = 'users';

-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'users';
```

## Step 9: Monitoring and Auditing

### 9.1 Track Role Changes
```sql
-- Create a simple audit log
CREATE TABLE IF NOT EXISTS user_role_audit (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    old_role VARCHAR(50),
    new_role VARCHAR(50),
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger function for automatic logging
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role != NEW.role THEN
        INSERT INTO user_role_audit (user_id, old_role, new_role, changed_by)
        VALUES (NEW.id, OLD.role, NEW.role, current_user);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER user_role_change_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_role_change();
```

### 9.2 View Audit Log
```sql
-- Check recent role changes
SELECT 
    u.email,
    ura.old_role,
    ura.new_role,
    ura.changed_by,
    ura.changed_at
FROM user_role_audit ura
JOIN users u ON ura.user_id = u.id
ORDER BY ura.changed_at DESC
LIMIT 20;
```

## Step 10: Quick Reference Commands

### Essential SQL Commands
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