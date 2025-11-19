#!/bin/bash
set -euo pipefail

echo "🚀 Starting Render build process..."

if [ -z "${DATABASE_URL:-}" ]; then
    echo "⚠️  DATABASE_URL not set - migrations will run at application startup"
    exit 0
fi

if [ ! -d "../node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma client not found, generating..."
    npx prisma generate
fi

echo "🧹 Resolving failed migrations (pre-build script)..."
node ./scripts/prebuild-db-setup.mjs || {
    echo "❌ Pre-build database cleanup failed"
    exit 1
}

echo "🔄 Deploying database migrations..."
if npx prisma migrate deploy --schema prisma/schema.prisma; then
    echo "✅ Migrations deployed successfully"
else
    echo "❌ Migration deployment failed"
    echo "📋 Checking migration status for details..."
    npx prisma migrate status --schema prisma/schema.prisma || true
    echo "🚨 CRITICAL: Migration deployment failed. Build cannot continue."
    exit 1
fi

echo "✅ Build preparation complete!"