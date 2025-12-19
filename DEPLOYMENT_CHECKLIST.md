# Deployment Checklist - Organization Asset Columns Fix

## 📋 Pre-Deployment

- [x] Migration created: `20251115_add_organization_asset_columns`
- [x] Migration tested locally (idempotent with IF NOT EXISTS)
- [x] Documentation created
- [x] Verification scripts created
- [ ] Changes committed to repository
- [ ] Changes pushed to deployment branch

## 🚀 Deployment Process

### Automatic Deployment (Recommended)
When you push to your deployment branch, Render will automatically:

1. **Pull Changes** - Get latest code from repository
2. **Install Dependencies** - Run `pnpm install`
3. **Run Migration Script** - Execute `bash scripts/render-migrate.sh`
   - Generates Prisma client
   - Resolves ghost migrations
   - **Applies new migration** ← This is where the fix happens
   - Verifies database connection
4. **Build API** - Run `pnpm run build`
5. **Deploy** - Start updated service

### Manual Deployment (If Needed)
If you need to apply the migration without a full deployment:

```bash
# Option 1: Via Render Shell
# 1. Go to Render Dashboard → pc-solutions-api → Shell
# 2. Run:
cd /opt/render/project/src/api
bash scripts/apply-missing-columns-migration.sh

# Option 2: Direct Prisma Command
cd /opt/render/project/src/api
npx prisma migrate deploy
npx prisma generate
```

## ✅ Post-Deployment Verification

### 1. Check Deployment Logs
Look for migration success messages in Render deployment logs:
```
✅ Added logoAssetId column to organizations table
✅ Added coverAssetId column to organizations table
✅ Foreign key constraints added successfully
✅ ORGANIZATION ASSET COLUMNS MIGRATION COMPLETE
```

### 2. Verify Database Schema
Run verification script:
```bash
# Via Render Shell or local connection
psql $DATABASE_URL -f api/scripts/verify-organization-columns.sql
```

Expected output:
```
 column_name  | data_type | is_nullable 
--------------+-----------+-------------
 coverAssetId | text      | YES
 logoAssetId  | text      | YES
(2 rows)
```

### 3. Test Profile Save Functionality

#### Test Case 1: New Service Provider
1. Create a new service provider account
2. Go to Settings → Profile
3. Fill out profile information:
   - Company Name: "Test Company"
   - Contact Email: (any valid email)
   - Phone Number: (any valid phone)
   - Contact Person: "Test Person"
   - Regions Served: Select 2-3 regions
   - Description: "Test description"
   - VAT Number: "CHE-123.456.789"
   - Languages: Select 2-3 languages
   - Service Type: "Test service"
   - Service Categories: Select 2-3 categories
   - Delivery Type: "On-site"
4. Click "Save Settings"
5. **Expected**: ✅ Success message, no errors
6. **Expected**: ✅ Profile data persists on page reload

#### Test Case 2: Existing Service Provider
1. Log in with existing service provider account
2. Go to Settings → Profile
3. Modify any field
4. Click "Save Settings"
5. **Expected**: ✅ Updates save successfully
6. **Expected**: ✅ No P2022 errors in logs

#### Test Case 3: Other Roles
1. Test with Foundation account (if applicable)
2. Test with Product Supplier account (if applicable)
3. **Expected**: ✅ All role-based profiles work

### 4. Monitor Backend Logs

#### Success Indicators
Look for these log messages after saving a profile:
```
LOG [SettingsController] 🔍 [DEBUG] Step 4: Organization created successfully
LOG [SettingsController] 🔍 [DEBUG] Step 5: UserOrganization link created successfully
LOG [SettingsController] 🔍 [DEBUG] updateServiceProviderSettings - SUCCESS
HTTP Request ... statusCode":200 ... url":"/api/settings/service-provider"
```

#### Error Indicators (Should NOT appear)
These should NOT be in the logs:
```
❌ ERROR [SettingsController] The column `organizations.coverAssetId` does not exist
❌ PrismaClientKnownRequestError: P2022
❌ statusCode":500
```

### 5. Check Migration Status
Verify migration was applied:
```bash
cd /opt/render/project/src/api
npx prisma migrate status
```

Expected output should include:
```
✅ 20251115_add_organization_asset_columns ... Applied
```

## 🐛 Troubleshooting

### Issue: Migration Failed During Deployment
**Symptoms**: Build logs show migration error
**Solution**: 
1. Check database permissions
2. Verify DATABASE_URL is correct
3. Check for conflicting migrations
4. Try manual application via Render Shell

### Issue: Profile Save Still Failing
**Symptoms**: Still getting P2022 error
**Possible Causes**:
1. Migration didn't run
   - **Check**: `npx prisma migrate status`
   - **Fix**: Run manually via Render Shell
2. Prisma client not regenerated
   - **Fix**: `npx prisma generate` and restart service
3. Different error
   - **Check**: Backend logs for actual error
   - **Fix**: Address the new error

### Issue: Columns Exist But Foreign Keys Missing
**Symptoms**: Columns present but constraints missing
**Solution**:
```sql
ALTER TABLE "public"."organizations" 
ADD CONSTRAINT "organizations_logoAssetId_fkey" 
FOREIGN KEY ("logoAssetId") REFERENCES "public"."assets"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."organizations" 
ADD CONSTRAINT "organizations_coverAssetId_fkey" 
FOREIGN KEY ("coverAssetId") REFERENCES "public"."assets"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;
```

## 📊 Success Metrics

After successful deployment, you should see:
- ✅ Zero P2022 errors in logs
- ✅ Service provider profile saves succeed
- ✅ All user roles can create/update profiles
- ✅ No 500 errors on settings endpoints
- ✅ Migration status shows all migrations applied

## 🔄 Rollback Plan

If deployment causes issues (unlikely with this migration):

1. **Columns are nullable** - Existing code continues to work
2. **No code changes** - Only database structure changed
3. **Safe to leave in place** - Even if unused, causes no harm

To remove columns if absolutely necessary:
```sql
ALTER TABLE "public"."organizations" DROP COLUMN IF EXISTS "logoAssetId";
ALTER TABLE "public"."organizations" DROP COLUMN IF EXISTS "coverAssetId";
```

But **this is not recommended** as the schema expects these columns.

## 📞 Support

If issues persist after deployment:
1. Check all items in this checklist
2. Review `/workspace/PROFILE_SAVE_BUG_FIX_SUMMARY.md`
3. Check migration file: `/workspace/api/prisma/migrations/20251115_add_organization_asset_columns/migration.sql`
4. Review logs for specific error messages

---

**Last Updated**: 2025-11-15
**Fix Version**: 1.0
**Critical Path**: Yes - blocks user onboarding
