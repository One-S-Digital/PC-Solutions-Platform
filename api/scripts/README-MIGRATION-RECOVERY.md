# Migration Recovery Scripts

This directory contains scripts to handle failed database migrations during deployment.

## Overview

When deploying to Render or other production environments, database migrations can sometimes fail due to:
- Race conditions
- Network issues
- Schema conflicts
- Case-sensitivity issues in PostgreSQL

## Scripts

### 1. `prebuild-db-setup.mjs`
**Auto-run before builds**

- Detects failed migrations automatically
- Resolves known migration issues
- Handles specific migrations with custom logic
- Safe to run multiple times (idempotent)

**Handled Migrations:**
- `20251104140358_add_asset_metadata_field` - Ensures metadata column exists
- `20251119100000_add_categories_array_fields` - Ensures category columns exist

### 2. `render-build-with-recovery.sh`
**Primary build script for Render**

Enhanced build process that:
1. Runs pre-build cleanup
2. Attempts migration deployment
3. Auto-recovers from known failures
4. Retries after successful recovery

**Usage in package.json:**
```json
{
  "scripts": {
    "build:render": "SKIP_SEED=true ./scripts/render-build-with-recovery.sh && ..."
  }
}
```

### 3. `fix-categories-migration.sh`
**Manual recovery tool**

Specifically fixes the categories migration issue.

**When to use:**
- Migration `20251119100000_add_categories_array_fields` fails
- Need to manually resolve migration state

**Usage:**
```bash
# Via npm
npm run fix:categories-migration

# Or directly
./scripts/fix-categories-migration.sh
```

**What it does:**
1. Marks failed migration as rolled back
2. Safely adds category columns (idempotent)
3. Migrates existing data from legacy columns
4. Marks migration as successfully applied

## Common Issues

### Issue: "column 'productcategory' does not exist"

**Cause:** PostgreSQL is case-sensitive when column names aren't quoted.

**Solution:** The prebuild script automatically handles this by:
- Using properly quoted column names in SQL
- Checking column existence before operations
- Using `IF NOT EXISTS` clauses

**Manual fix:**
```bash
npm run fix:categories-migration
```

### Issue: Migration marked as failed in database

**Cause:** Previous deployment attempt failed mid-migration.

**Solution:** The prebuild script detects and auto-resolves this:
1. Detects failed migration state
2. Executes recovery logic
3. Marks as applied/rolled-back as appropriate

## Development vs Production

### Development
```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset
```

### Production (Render)
```bash
# Automatic via build script
npm run build:render

# Manual check
npx prisma migrate status

# Manual deployment
npx prisma migrate deploy
```

## Adding New Migration Handlers

To add a handler for a new problematic migration:

1. Edit `prebuild-db-setup.mjs`
2. Add your recovery function (like `ensureCategoriesColumns`)
3. Add case to `handleFailedMigration` switch statement:

```javascript
case '20251119100000_your_migration':
  log(`   • Resolving ${migration} (description)`);
  ensureYourFix();
  resolveMigration('applied', migration);
  break;
```

## Monitoring

Check migration status anytime:
```bash
npx prisma migrate status
```

View detailed migration history:
```bash
npx prisma migrate status --schema prisma/schema.prisma
```

## Best Practices

1. **Always test migrations locally first**
   ```bash
   npm run db:migrate:dev
   ```

2. **Use idempotent SQL**
   - Always use `IF NOT EXISTS` clauses
   - Check before creating/altering
   - Safe to run multiple times

3. **Quote PostgreSQL identifiers**
   - Table names: `"tableName"`
   - Column names: `"columnName"`
   - Prevents case-sensitivity issues

4. **Handle data migration carefully**
   - Check for NULL values
   - Use COALESCE for defaults
   - Test with production-like data

## Troubleshooting

If automatic recovery fails:

1. Check logs for specific error
2. Verify DATABASE_URL is set correctly
3. Manually inspect database state:
   ```sql
   SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
   ```
4. Run manual fix script
5. Contact DevOps if issue persists

## Support

For issues with these scripts:
1. Check this README
2. Review script comments
3. Check Prisma migration docs: https://pris.ly/d/migrate-resolve
4. Contact the development team
