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
    
    # Check if the specific categories migration failed
    if npx prisma migrate status --schema prisma/schema.prisma | grep -q "20251119100000_add_categories_array_fields.*failed"; then
        echo "🔧 Detected failed categories migration, attempting automatic fix..."
        ./scripts/fix-categories-migration.sh || {
            echo "❌ Could not fix categories migration automatically"
            echo "📋 Migration status:"
            npx prisma migrate status --schema prisma/schema.prisma || true
            exit 1
        }
        
        # Retry migration deployment after fix
        echo "🔄 Retrying migration deployment..."
        if npx prisma migrate deploy --schema prisma/schema.prisma; then
            echo "✅ Migrations deployed successfully after recovery"
        else
            echo "❌ Migration still failing after recovery attempt"
            echo "📋 Final migration status:"
            npx prisma migrate status --schema prisma/schema.prisma || true
            exit 1
        fi
    else
        echo "❌ Migration deployment failed for unknown reason"
        echo "📋 Migration status:"
        npx prisma migrate status --schema prisma/schema.prisma || true
        exit 1
    fi
fi

echo "✅ Build preparation complete!"
