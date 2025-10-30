# Database Schema Maintenance Guide

## 🎯 Purpose

This guide provides best practices and procedures for maintaining database schema integrity across all environments to prevent issues like the `stripeCustomerId` column problem.

---

## 📋 Quick Reference

### Daily Tasks
```bash
# None required - automated via deployment
```

### Before Each Deployment
```bash
# Verify schema is in sync
cd api
npx ts-node scripts/verify-schema.ts
```

### After Each Deployment
```bash
# Check deployment logs for migration success
# Verify webhook processing works
# Run health check: curl https://your-domain.com/api/webhooks/clerk/health
```

### Monthly Tasks
```bash
# Run comprehensive schema audit
psql $DATABASE_URL -f api/scripts/verify-db-schema.sql

# Review audit logs
# Check for any schema drift
```

---

## 🔄 Schema Change Workflow

### 1. Planning Phase

**Before making any schema changes:**

```bash
# Check current schema state
npx prisma db pull

# Review existing migrations
ls -la api/prisma/migrations/

# Check for pending migrations
npx prisma migrate status
```

**Questions to ask:**
- Does this change affect existing data?
- Do we need a data migration?
- Will this break existing API contracts?
- Do we need to update multiple tables?
- Are there foreign key dependencies?

### 2. Development Phase

**Step 1: Update Prisma Schema**

Edit `api/prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  // Add your new field here
  newField  String?  // Make nullable initially
  
  @@map("users")
}
```

**Step 2: Generate Migration**

```bash
# Create migration with descriptive name
npx prisma migrate dev --name add_user_new_field

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to local database
# 3. Regenerate Prisma Client
```

**Step 3: Review Migration File**

Check the generated SQL in `api/prisma/migrations/TIMESTAMP_add_user_new_field/migration.sql`:

```sql
-- Review this carefully
ALTER TABLE "users" ADD COLUMN "newField" TEXT;
```

**Step 4: Test Locally**

```bash
# Run your application
npm run start:dev

# Test affected features
npm run test:integration

# Verify schema
npx ts-node scripts/verify-schema.ts
```

### 3. Staging Phase

**Step 1: Deploy to Staging**

```bash
# Push to staging branch
git checkout staging
git merge main
git push origin staging
```

**Step 2: Verify on Staging**

```bash
# SSH into staging or use staging DATABASE_URL
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# Run verification
DATABASE_URL=$STAGING_DATABASE_URL npx ts-node scripts/verify-schema.ts

# Test all affected features
```

**Step 3: Load Test (if applicable)**

```bash
# Run load tests against staging
# Verify performance impact
# Check migration execution time
```

### 4. Production Deployment Phase

**Step 1: Backup Database**

```bash
# Create backup before migration (on Render/your hosting)
# Most platforms do this automatically, but verify
```

**Step 2: Deploy to Production**

```bash
git checkout main
git merge staging
git push origin main

# Or trigger manual deploy on Render
```

**Step 3: Monitor Deployment**

Watch Render logs for:
```
🔄 Deploying database migrations...
Migration `20251030_add_user_new_field` applied
✅ Build preparation complete!
```

**Step 4: Post-Deployment Verification**

```bash
# Health check
curl https://your-api-domain.com/health

# Webhook health check
curl https://your-api-domain.com/api/webhooks/clerk/health

# Verify critical user flows
# - Sign up
# - Login
# - Profile update
```

**Step 5: Monitor for Issues**

- Watch error logs for 24 hours
- Monitor database performance
- Check for any webhook failures
- Verify subscription processing

### 5. Rollback Procedure (if needed)

**Option 1: Revert Migration (preferred)**

```bash
# Create rollback migration
npx prisma migrate dev --name rollback_user_new_field

# Manually write the down migration
-- In the new migration file:
ALTER TABLE "users" DROP COLUMN "newField";
```

**Option 2: Restore from Backup (last resort)**

```bash
# Restore database from backup
# Contact Render support or use your backup tool
# This will lose any data created after backup
```

---

## 🛡️ Safety Measures

### Making Columns Nullable First

When adding a new required column:

```sql
-- ✅ GOOD: Add as nullable first
ALTER TABLE "users" ADD COLUMN "newField" TEXT;

-- Migrate existing data
UPDATE "users" SET "newField" = 'default_value' WHERE "newField" IS NULL;

-- Then make it required in a separate migration
ALTER TABLE "users" ALTER COLUMN "newField" SET NOT NULL;
```

```sql
-- ❌ BAD: Add as required immediately
ALTER TABLE "users" ADD COLUMN "newField" TEXT NOT NULL;
-- This will fail if table has existing rows!
```

### Dropping Columns Safely

Never drop columns directly. Use a 3-step process:

```sql
-- Step 1: Make column nullable (if not already)
ALTER TABLE "users" ALTER COLUMN "oldField" DROP NOT NULL;

-- Step 2: Deploy and verify code doesn't use it
-- Wait 1-2 weeks to ensure no issues

-- Step 3: Drop the column
ALTER TABLE "users" DROP COLUMN "oldField";
```

### Renaming Columns Safely

Don't rename - use a 4-step process:

```sql
-- Step 1: Add new column
ALTER TABLE "users" ADD COLUMN "newName" TEXT;

-- Step 2: Migrate data
UPDATE "users" SET "newName" = "oldName";

-- Step 3: Update code to use newName
-- Deploy and verify

-- Step 4: Drop old column (after 1-2 weeks)
ALTER TABLE "users" DROP COLUMN "oldName";
```

### Modifying Foreign Keys

Always in this order:

```sql
-- Step 1: Drop old foreign key
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- Step 2: Modify column
ALTER TABLE "orders" ALTER COLUMN "userId" TYPE TEXT;

-- Step 3: Add new foreign key
ALTER TABLE "orders" 
  ADD CONSTRAINT "orders_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") 
  ON DELETE CASCADE;
```

---

## 🔍 Verification Procedures

### Manual Verification Checklist

After every schema change:

```bash
# ✅ Check all tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

# ✅ Check critical columns
\d users
\d "AppUser"

# ✅ Check indexes
\di

# ✅ Check foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### Automated Verification

```bash
# Run our verification script
npx ts-node api/scripts/verify-schema.ts

# Expected output:
# ✅ All 41 required tables exist
# ✅ All critical user columns exist
# ✅ All critical indexes exist
# ✅ Found 100+ foreign key constraints
# ✅ Schema verification PASSED
```

### Integration Tests

Always test critical flows after schema changes:

```bash
# Run integration tests
cd api
npm run test:integration

# Specific tests for auth
npm run test:auth

# Test webhooks
curl -X POST https://your-domain.com/api/webhooks/clerk/test
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Migration Fails with "Column Already Exists"

**Symptom:**
```
Error: column "stripeCustomerId" of relation "users" already exists
```

**Solution:**
Make migration idempotent using `IF NOT EXISTS`:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'stripeCustomerId'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
    END IF;
END $$;
```

### Issue 2: Foreign Key Violation

**Symptom:**
```
Error: insert or update on table "orders" violates foreign key constraint
```

**Solution:**
1. Check if referenced row exists
2. Temporarily disable constraint if needed for migration
3. Clean up orphaned data
4. Re-enable constraint

```sql
-- Disable constraint
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- Fix data
DELETE FROM "orders" WHERE "userId" NOT IN (SELECT id FROM "users");

-- Re-add constraint
ALTER TABLE "orders" 
  ADD CONSTRAINT "orders_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id");
```

### Issue 3: Migration Timeout

**Symptom:**
```
Migration timeout after 30 seconds
```

**Solution:**
Break large migrations into smaller chunks:

```sql
-- Instead of one big migration:
ALTER TABLE "users" ADD COLUMN "field1" TEXT;
ALTER TABLE "users" ADD COLUMN "field2" TEXT;
-- ... 20 more columns

-- Split into multiple migrations:
-- Migration 1: Add fields 1-10
-- Migration 2: Add fields 11-20
```

### Issue 4: Prisma Client Out of Sync

**Symptom:**
```
TypeScript error: Property 'newField' does not exist on type 'User'
```

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Restart TypeScript server
# In VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Issue 5: Schema Drift Between Environments

**Symptom:**
```
Local database has column X but production doesn't
```

**Solution:**
```bash
# Reset local database to match production
npx prisma migrate reset

# Or pull production schema
npx prisma db pull --force

# Apply all migrations fresh
npx prisma migrate deploy
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

1. **Migration Duration**
   - Alert if > 5 minutes
   - Track trends over time

2. **Failed Migrations**
   - Alert immediately
   - Automatic rollback trigger

3. **Schema Drift**
   - Weekly verification
   - Compare prod vs Prisma schema

4. **Database Performance**
   - Query times before/after migration
   - Index usage statistics

### Setting Up Alerts

```yaml
# Example: GitHub Actions Alert
name: Schema Verification
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Verify Schema
        run: |
          cd api
          npx ts-node scripts/verify-schema.ts
      - name: Notify on Failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Schema verification failed!'
```

---

## 🎓 Training & Best Practices

### For Developers

**DO:**
- ✅ Always use migrations, never manual SQL
- ✅ Test migrations locally first
- ✅ Make columns nullable initially
- ✅ Use descriptive migration names
- ✅ Add comments to complex migrations
- ✅ Run verification after changes

**DON'T:**
- ❌ Edit production database manually
- ❌ Skip migration files
- ❌ Rename columns directly
- ❌ Drop columns immediately
- ❌ Assume migration will work in production

### Code Review Checklist

When reviewing PRs with schema changes:

- [ ] Migration file is idempotent
- [ ] New columns are nullable or have defaults
- [ ] Indexes added for foreign keys
- [ ] Foreign key constraints are correct
- [ ] Migration has been tested locally
- [ ] Verification script passes
- [ ] Integration tests updated
- [ ] Documentation updated
- [ ] Rollback procedure documented

---

## 📅 Scheduled Maintenance

### Weekly

```bash
# Run schema verification
npx ts-node api/scripts/verify-schema.ts

# Review error logs for schema-related issues
# Check slow query log for missing indexes
```

### Monthly

```bash
# Full schema audit
psql $DATABASE_URL -f api/scripts/verify-db-schema.sql

# Review and optimize indexes
# Clean up old migrations (keep last 6 months)
# Update documentation
```

### Quarterly

```bash
# Performance review
# Analyze query patterns
# Optimize table structure if needed
# Plan for major schema refactoring
```

---

## 🔗 Related Documentation

- [Database Schema Audit Report](./DATABASE_SCHEMA_AUDIT_REPORT.md)
- [Webhook Fix Instructions](./WEBHOOK_FIX_INSTRUCTIONS.md)
- [Database Migration Setup](./docs/DATABASE_MIGRATION_SETUP.md)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 📞 Support

### Getting Help

1. **Check verification script first:**
   ```bash
   npx ts-node api/scripts/verify-schema.ts
   ```

2. **Review migration logs:**
   ```bash
   npx prisma migrate status
   ```

3. **Check documentation:**
   - This guide
   - Audit report
   - Prisma docs

4. **Contact team:**
   - Create GitHub issue
   - Tag database admin
   - Include verification output

---

**Last Updated:** 2025-10-30  
**Next Review:** 2025-11-30  
**Maintainer:** Development Team
