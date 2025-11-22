#!/bin/bash
set -euo pipefail

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
node ./scripts/prebuild-db-setup.mjs || {
    echo "❌ Pre-build database cleanup failed"
    exit 1
}

echo "🔄 Step 2: Deploying database migrations..."
if npx prisma migrate deploy --schema prisma/schema.prisma; then
    echo "✅ Migrations deployed successfully"
else
    MIGRATION_EXIT_CODE=$?
    echo "⚠️  Migration deployment failed with exit code $MIGRATION_EXIT_CODE"
    
    # Get migration status
    echo "📋 Checking migration status..."
    MIGRATION_STATUS=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1) || true
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
        if npx prisma migrate deploy --schema prisma/schema.prisma; then
            echo "✅ Migrations deployed successfully after recovery"
        else
            echo "⚠️  Migration still showing issues, checking if columns exist..."
            
            # Verify columns exist in database
            echo "🔍 Verifying database schema..."
            VERIFY_TMP=$(mktemp)
            if ! npx prisma db execute --stdin >"$VERIFY_TMP" 2>&1 <<'EOSQL'; then
                :
            fi
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
            VERIFY_RESULT=$(cat "$VERIFY_TMP")
            rm -f "$VERIFY_TMP"
            
            echo "$VERIFY_RESULT"
            
            # If columns exist, mark migration as applied and continue
            if echo "$VERIFY_RESULT" | grep -q "EXISTS" && ! echo "$VERIFY_RESULT" | grep -q "MISSING"; then
                echo "✅ Columns exist in database, marking migration as applied..."
                npx prisma migrate resolve --applied "20251119100000_add_categories_array_fields" --schema prisma/schema.prisma || true
                echo "✅ Build can continue - schema is correct"
            else
                echo "❌ Columns are missing from database"
                echo "📋 Final migration status:"
                npx prisma migrate status --schema prisma/schema.prisma || true
                exit 1
            fi
        fi
    else
        echo "🩹 Attempting automatic repair by rerunning pre-build cleanup..."
        if node ./scripts/prebuild-db-setup.mjs; then
            echo "🔄 Retrying migration deployment after automatic repair..."
            if npx prisma migrate deploy --schema prisma/schema.prisma; then
                echo "✅ Migrations deployed successfully after automatic repair"
            else
                echo "❌ Migration deployment failed after automatic repair attempts"
                echo "📋 Migration status:"
                npx prisma migrate status --schema prisma/schema.prisma || true
                exit 1
            fi
        else
            echo "⚠️  Automatic repair script encountered an issue"
            echo "📋 Migration status:"
            npx prisma migrate status --schema prisma/schema.prisma || true
            exit 1
        fi
    fi
fi

echo "✅ Build preparation complete!"
