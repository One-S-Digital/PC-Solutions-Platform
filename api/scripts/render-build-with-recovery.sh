#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PRISMA_SCHEMA_PATH="$API_DIR/prisma/schema.prisma"

cd "$API_DIR"

CONTENT_CATEGORY_MIGRATION_ID="20251117145622_add_content_category_field"
TRANSLATION_MIGRATION_ID="20251114140526_add_i18n_translation_tables"
MIGRATION_LAST_OUTPUT=""

check_content_category_column() {
    local tmp result
    tmp=$(mktemp)
    if ! npx prisma db execute --schema "$PRISMA_SCHEMA_PATH" --stdin >"$tmp" 2>&1 <<'EOSQL'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
              AND column_name = 'contentCategory'
        ) 
        THEN 'assets.contentCategory EXISTS'
        ELSE 'assets.contentCategory MISSING'
    END as assets_check;
EOSQL
    then
        :
    fi
    result=$(cat "$tmp")
    rm -f "$tmp"
    echo "$result"
}

run_prisma_migrate_deploy() {
    local output exit_code
    if output=$(npx prisma migrate deploy --schema "$PRISMA_SCHEMA_PATH" 2>&1); then
        MIGRATION_LAST_OUTPUT="$output"
        printf '%s\n' "$output"
        return 0
    else
        exit_code=$?
        MIGRATION_LAST_OUTPUT="$output"
        printf '%s\n' "$output"
        return $exit_code
    fi
}

echo "🚀 Starting Render build with migration recovery..."

if [ -z "${DATABASE_URL:-}" ]; then
    echo "⚠️  DATABASE_URL not set - migrations will run at application startup"
    exit 0
fi

# Ensure Prisma client is generated
if [ ! -d "../node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma client not found, generating..."
    npx prisma generate
fi

echo "🧹 Step 1: Pre-build cleanup and failed migration resolution..."
node ./scripts/fix-asset-url-constraint.mjs || {
    echo "⚠️  Asset URL constraint fix failed (ignoring)"
}
node ./scripts/prebuild-db-setup.mjs || {
    echo "❌ Pre-build database cleanup failed"
    exit 1
}

echo "🔄 Step 2: Deploying database migrations..."
if run_prisma_migrate_deploy; then
    echo "✅ Migrations deployed successfully"
else
    MIGRATION_EXIT_CODE=$?
    echo "⚠️  Migration deployment failed with exit code $MIGRATION_EXIT_CODE"
    
    # Get migration status
    echo "📋 Checking migration status..."
    MIGRATION_STATUS=$(npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" 2>&1) || true
    echo "$MIGRATION_STATUS"
    
    # Check if categories migration failed (multiple patterns)
    if echo "$MIGRATION_STATUS" | grep -q "20251119100000_add_categories_array_fields"; then
        echo "🔧 Detected failed categories migration, attempting automatic fix..."
        
        # Run the fix script
        if ./scripts/fix-categories-migration.sh; then
            echo "✅ Fix script completed successfully"
        else
            echo "⚠️  Fix script had issues, but continuing..."
        fi
        
        # Retry migration deployment after fix
        echo "🔄 Retrying migration deployment..."
        if run_prisma_migrate_deploy; then
            echo "✅ Migrations deployed successfully after recovery"
        else
            echo "⚠️  Migration still showing issues, checking if columns exist..."
            
            # Verify columns exist in database
            echo "🔍 Verifying database schema..."
            VERIFY_TMP=$(mktemp)
            if ! npx prisma db execute --schema "$PRISMA_SCHEMA_PATH" --stdin >"$VERIFY_TMP" 2>&1 <<'EOSQL'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'categories') 
        THEN 'products.categories EXISTS'
        ELSE 'products.categories MISSING'
    END as products_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'categories')
        THEN 'services.categories EXISTS'
        ELSE 'services.categories MISSING'
    END as services_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'productCategories')
        THEN 'organizations.productCategories EXISTS'
        ELSE 'organizations.productCategories MISSING'
    END as orgs_check;
EOSQL
            then
                :
            fi
            VERIFY_RESULT=$(cat "$VERIFY_TMP")
            rm -f "$VERIFY_TMP"
            
            echo "$VERIFY_RESULT"
            
            # If columns exist, mark migration as applied and continue
            if echo "$VERIFY_RESULT" | grep -q "EXISTS" && ! echo "$VERIFY_RESULT" | grep -q "MISSING"; then
                echo "✅ Columns exist in database, marking migration as applied..."
                npx prisma migrate resolve --applied "20251119100000_add_categories_array_fields" --schema "$PRISMA_SCHEMA_PATH" || true
                echo "✅ Build can continue - schema is correct"
            else
                echo "❌ Columns are missing from database"
                echo "📋 Final migration status:"
                npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
                exit 1
            fi
        fi
    # elif echo "$MIGRATION_LAST_OUTPUT" | grep -q "$TRANSLATION_MIGRATION_ID" || echo "$MIGRATION_STATUS" | grep -q "$TRANSLATION_MIGRATION_ID"; then
    #     echo "🔧 Detected failed translation infrastructure migration, attempting automatic fix..."
    #     if FORCE_RESOLVE_MIGRATIONS="$TRANSLATION_MIGRATION_ID" node ./scripts/prebuild-db-setup.mjs; then
    #         echo "🔄 Retrying migration deployment after translation fix..."
    #         if run_prisma_migrate_deploy; then
    #             echo "✅ Migrations deployed successfully after translation fix"
    #         else
    #             echo "❌ Translation migration still failing"
    #             echo "📋 Final migration status:"
    #             npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
    #             exit 1
    #         fi
    #     else
    #         echo "⚠️  Translation recovery script encountered an issue"
    #         echo "📋 Migration status:"
    #         npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
    #         exit 1
    #     fi
    elif echo "$MIGRATION_STATUS" | grep -q "20251202_foundation_pages_enhancements"; then
        echo "🔧 Detected failed foundation pages migration, ensuring parent_leads table exists..."
        
        # Run the fix using prebuild script
        if node ./scripts/prebuild-db-setup.mjs; then
            echo "✅ Prerequisite tables created"
        else
            echo "⚠️  Prerequisite fix had issues, but continuing..."
        fi
        
        # Mark migration as rolled back and retry
        echo "🔄 Rolling back failed migration and retrying..."
        npx prisma migrate resolve --rolled-back "20251202_foundation_pages_enhancements" --schema "$PRISMA_SCHEMA_PATH" || true
        
        # Retry migration deployment
        echo "🔄 Retrying migration deployment after fix..."
        if run_prisma_migrate_deploy; then
            echo "✅ Migrations deployed successfully after foundation pages fix"
        else
            echo "⚠️  Migration still failing, applying schema manually..."
            
            # Apply the schema manually and mark as applied
            FORCE_RESOLVE_MIGRATIONS="20251202_foundation_pages_enhancements" node ./scripts/prebuild-db-setup.mjs || true
            
            # Verify the tables exist
            echo "🔍 Verifying foundation pages tables..."
            VERIFY_TMP=$(mktemp)
            if ! npx prisma db execute --schema "$PRISMA_SCHEMA_PATH" --stdin >"$VERIFY_TMP" 2>&1 <<'EOSQL'
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_leads') 
        THEN 'parent_leads EXISTS' ELSE 'parent_leads MISSING' END as parent_leads_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'foundation_lead_responses') 
        THEN 'foundation_lead_responses EXISTS' ELSE 'foundation_lead_responses MISSING' END as flr_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') 
        THEN 'support_tickets EXISTS' ELSE 'support_tickets MISSING' END as st_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') 
        THEN 'calendar_events EXISTS' ELSE 'calendar_events MISSING' END as ce_check;
EOSQL
            then
                :
            fi
            VERIFY_RESULT=$(cat "$VERIFY_TMP")
            rm -f "$VERIFY_TMP"
            
            echo "$VERIFY_RESULT"
            
            if echo "$VERIFY_RESULT" | grep -q "EXISTS" && ! echo "$VERIFY_RESULT" | grep -q "MISSING"; then
                echo "✅ All tables exist, marking migration as applied..."
                npx prisma migrate resolve --applied "20251202_foundation_pages_enhancements" --schema "$PRISMA_SCHEMA_PATH" || true
                echo "✅ Build can continue - schema is correct"
            else
                echo "❌ Some tables are missing"
                echo "📋 Final migration status:"
                npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
                exit 1
            fi
        fi
    elif echo "$MIGRATION_STATUS" | grep -q "$CONTENT_CATEGORY_MIGRATION_ID"; then
        echo "🔧 Detected pending content category migration, attempting automatic fix..."
        CONTENT_STATUS=$(check_content_category_column)
        echo "$CONTENT_STATUS"

        if echo "$CONTENT_STATUS" | grep -q "MISSING"; then
            echo "🛠️  Column missing, applying manual schema patch..."
            if npx prisma db execute --schema "$PRISMA_SCHEMA_PATH" --stdin <<'EOSQL'
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "contentCategory" TEXT;
CREATE INDEX IF NOT EXISTS "assets_contentCategory_idx" ON "assets"("contentCategory");
EOSQL
            then
                echo "✅ Manual content category patch applied"
            else
                echo "⚠️  Manual patch execution reported an error, proceeding with verification"
            fi
        else
            echo "✅ Column already present, migration likely already applied"
        fi

        echo "🔄 Retrying migration deployment after content category fix..."
        if run_prisma_migrate_deploy; then
            echo "✅ Migrations deployed successfully after content category fix"
        else
            echo "⚠️  Migration still failing, verifying schema state..."
            CONTENT_STATUS=$(check_content_category_column)
            echo "$CONTENT_STATUS"

            if echo "$CONTENT_STATUS" | grep -q "EXISTS" && ! echo "$CONTENT_STATUS" | grep -q "MISSING"; then
                echo "✅ Column confirmed, marking migration as applied..."
                npx prisma migrate resolve --applied "$CONTENT_CATEGORY_MIGRATION_ID" --schema "$PRISMA_SCHEMA_PATH" || true
                echo "✅ Build can continue - schema is correct"
            else
                echo "❌ Content category column still missing after fix attempt"
                echo "📋 Final migration status:"
                npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
                exit 1
            fi
        fi
    else
        echo "🩹 Attempting automatic repair by rerunning pre-build cleanup..."
        if node ./scripts/prebuild-db-setup.mjs; then
            echo "🔄 Retrying migration deployment after automatic repair..."
            if run_prisma_migrate_deploy; then
                echo "✅ Migrations deployed successfully after automatic repair"
            else
                echo "❌ Migration deployment failed after automatic repair attempts"
                echo "📋 Migration status:"
                npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
                exit 1
            fi
        else
            echo "⚠️  Automatic repair script encountered an issue"
            echo "📋 Migration status:"
            npx prisma migrate status --schema "$PRISMA_SCHEMA_PATH" || true
            exit 1
        fi
    fi
fi

echo "✅ Build preparation complete!"
