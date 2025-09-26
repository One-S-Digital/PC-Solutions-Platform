# Branding Settings Upload Fix

## Issue Description

The branding settings upload was failing with a 500 Internal Server Error when trying to upload admin favicon. The error logs showed:

```
PrismaClientKnownRequestError: 
Invalid `prisma.asset.create()` invocation:
The column `publicUrl` does not exist in the current database.
```

## Root Cause Analysis

The issue had two parts:

### 1. Missing Database Column
The `assets` table in the production database was missing the `publicUrl` column, even though it was defined in the Prisma schema and initial migration. This suggests a schema drift between the migration files and the actual database state.

### 2. Missing Validation Rules
The `CloudflareR2Service.validateFile()` method was missing validation rules for the frontend and admin asset kinds:
- `FRONTEND_LOGO`
- `FRONTEND_FAVICON` 
- `FRONTEND_OG_IMAGE`
- `ADMIN_LOGO`
- `ADMIN_FAVICON`
- `CATALOG_PDF`
- `CATALOG_CSV`

When the upload service tried to validate files with these asset kinds, it looked up `maxSizes[assetKind]` and `allowedTypes[assetKind]` but these properties didn't exist, causing the validation to fail.

## Solution

### 1. Database Migration
Created a new migration `20250925213650_add_missing_public_url_to_assets` that:
- Checks if the `publicUrl` column exists before adding it
- Adds the column with a temporary default value
- Updates existing records with placeholder URLs
- Removes the default constraint after populating data

### 2. Validation Fix
Updated `api/src/upload/cloudflare-r2.service.ts` to include validation rules for all asset kinds:
- Added size limits for frontend/admin assets (1-5MB)
- Added allowed MIME types for each asset kind
- Added proper error handling for unsupported asset kinds

### 3. Deployment
The fix will be automatically applied during the next deployment because:
- The migration is included in the `prisma/migrations` directory
- The render build script runs `npx prisma migrate deploy` automatically
- The updated validation code is included in the build

## Files Modified

1. `api/prisma/migrations/20250925213650_add_missing_public_url_to_assets/migration.sql` - Database migration
2. `api/src/upload/cloudflare-r2.service.ts` - Validation logic fix
3. `api/scripts/fix-assets-table.sql` - Manual fix script (backup)

## Testing

After deployment, the branding settings upload should work correctly for:
- Admin favicon uploads
- Admin logo uploads  
- Frontend favicon uploads
- Frontend logo uploads
- OpenGraph image uploads

## Manual Fix (if needed)

If the automatic migration doesn't work, you can manually run:

```sql
-- Connect to the production database and run:
\i api/scripts/fix-assets-table.sql
```

Or use the Prisma CLI:
```bash
cd api
npx prisma migrate deploy
```

## Verification

To verify the fix is working:
1. Check that the `publicUrl` column exists in the `assets` table
2. Try uploading a favicon through the admin interface
3. Check the logs for any validation errors
4. Verify the file is uploaded to R2 and the database record is created