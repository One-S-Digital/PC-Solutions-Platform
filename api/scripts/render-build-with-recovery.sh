#!/bin/bash
set -euo pipefail

echo "🚀 Starting Render build process (with recovery)..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠️  DATABASE_URL not set - migrations will run at application startup"
  exit 0
fi

PRISMA_BIN="../node_modules/.bin/prisma"
if [ -x "$PRISMA_BIN" ]; then
  PRISMA_CMD="$PRISMA_BIN"
else
  PRISMA_CMD="npx prisma"
fi

if [ ! -d "../node_modules/@prisma/client" ]; then
  echo "⚠️  Prisma client not found, generating..."
  $PRISMA_CMD generate --schema prisma/schema.prisma
fi

echo "🧹 Resolving failed migrations (pre-build script)..."
node ./scripts/prebuild-db-setup.mjs || {
  echo "❌ Pre-build database cleanup failed"
  exit 1
}

echo "🔄 Deploying database migrations..."
if $PRISMA_CMD migrate deploy --schema prisma/schema.prisma; then
  echo "✅ Migrations deployed successfully"
  echo "✅ Build preparation complete!"
  exit 0
fi

echo "❌ Migration deployment failed (first attempt)"
echo "📋 Checking migration status for details..."
$PRISMA_CMD migrate status --schema prisma/schema.prisma || true

echo "🛠️  Attempting automated recovery + retry..."
node ./scripts/prebuild-db-setup.mjs || true

if $PRISMA_CMD migrate deploy --schema prisma/schema.prisma; then
  echo "✅ Migrations deployed successfully after recovery"
  echo "✅ Build preparation complete!"
  exit 0
fi

echo "🚨 CRITICAL: Migration deployment failed after recovery. Build cannot continue."
$PRISMA_CMD migrate status --schema prisma/schema.prisma || true
exit 1

