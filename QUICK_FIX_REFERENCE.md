# 🚨 Quick Fix Reference - Profile Save Error

## The Problem
```
ERROR: The column `organizations.coverAssetId` does not exist in the current database
```
Service providers cannot save their profiles.

## The Solution
✅ Migration created: `/workspace/api/prisma/migrations/20251115_add_organization_asset_columns/migration.sql`

## To Fix

### 🎯 Fastest: Just Push to Deploy
```bash
git add .
git commit -m "fix: add missing organization asset columns migration"
git push
```
**That's it!** Render will auto-apply the migration during deployment.

### ⚡ If Urgent: Manual Fix
```bash
# On Render Shell
cd /opt/render/project/src/api
bash scripts/apply-missing-columns-migration.sh
```

## To Verify

### After Deployment
1. **Check logs** for: `✅ ORGANIZATION ASSET COLUMNS MIGRATION COMPLETE`
2. **Test**: Create/update a service provider profile
3. **Expected**: Profile saves successfully, no errors

### Quick Database Check
```bash
psql $DATABASE_URL -f api/scripts/verify-organization-columns.sql
```

## Files Created
- ✅ Migration: `api/prisma/migrations/20251115_add_organization_asset_columns/migration.sql`
- 📖 Full docs: `PROFILE_SAVE_BUG_FIX_SUMMARY.md`
- ☑️ Checklist: `DEPLOYMENT_CHECKLIST.md`
- 🔍 Verify script: `api/scripts/verify-organization-columns.sql`
- 🛠️ Apply script: `api/scripts/apply-missing-columns-migration.sh`

## What Changed
- **Database**: Added 2 columns to organizations table (`logoAssetId`, `coverAssetId`)
- **Code**: Nothing! Code was already correct
- **Schema**: Already had the columns defined

## Timeline
- **Deploy**: < 5 minutes (automatic)
- **Manual**: < 2 minutes
- **User Impact**: Fixed immediately after deployment

## Safety
- ✅ Safe to run multiple times (uses IF NOT EXISTS)
- ✅ No data loss (columns are nullable)
- ✅ No code changes needed
- ✅ Backwards compatible

---

**Status**: ✅ Ready to Deploy  
**Priority**: 🔴 High  
**Risk**: 🟢 Low
