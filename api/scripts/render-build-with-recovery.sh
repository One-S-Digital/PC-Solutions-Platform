#!/bin/bash
set -euo pipefail

echo "🚀 Starting Render build process (with recovery)..."
echo ""

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

# Ensure Prisma client exists
if [ ! -d "../node_modules/@prisma/client" ]; then
  echo "⚠️  Prisma client not found, generating..."
  $PRISMA_CMD generate --schema prisma/schema.prisma
fi

# ============================================================
# PHASE 1: Pre-migration database setup and recovery
# ============================================================
echo ""
echo "=========================================="
echo "  PHASE 1: Database Setup & Recovery"
echo "=========================================="
echo ""

echo "🧹 Running pre-build database setup (resolving failed migrations, ensuring columns exist)..."
node ./scripts/prebuild-db-setup.mjs || {
  echo "⚠️  Pre-build database setup had issues, continuing anyway..."
}

# ============================================================
# PHASE 2: Deploy migrations
# ============================================================
echo ""
echo "=========================================="
echo "  PHASE 2: Migration Deployment"
echo "=========================================="
echo ""

echo "🔄 Deploying database migrations..."
if $PRISMA_CMD migrate deploy --schema prisma/schema.prisma; then
  echo ""
  echo "✅ Migrations deployed successfully"
  echo ""
  
  # Show final status
  echo "📋 Final migration status:"
  $PRISMA_CMD migrate status --schema prisma/schema.prisma || true
  
  echo ""
  echo "=========================================="
  echo "  ✅ Build preparation complete!"
  echo "=========================================="
  echo ""
  exit 0
fi

# ============================================================
# PHASE 3: Recovery attempt
# ============================================================
echo ""
echo "=========================================="
echo "  PHASE 3: Recovery Attempt"
echo "=========================================="
echo ""

echo "❌ Migration deployment failed (first attempt)"
echo "📋 Checking migration status for details..."
$PRISMA_CMD migrate status --schema prisma/schema.prisma || true

echo ""
echo "🛠️  Attempting automated recovery + retry..."
node ./scripts/prebuild-db-setup.mjs || true

echo ""
echo "🔄 Retrying migration deployment..."
if $PRISMA_CMD migrate deploy --schema prisma/schema.prisma; then
  echo ""
  echo "✅ Migrations deployed successfully after recovery"
  
  # Show final status
  echo "📋 Final migration status:"
  $PRISMA_CMD migrate status --schema prisma/schema.prisma || true
  
  echo ""
  echo "=========================================="
  echo "  ✅ Build preparation complete!"
  echo "=========================================="
  echo ""
  exit 0
fi

# ============================================================
# FAILURE
# ============================================================
echo ""
echo "=========================================="
echo "  ❌ CRITICAL: Migration Failed"
echo "=========================================="
echo ""
echo "🚨 Migration deployment failed after recovery. Build cannot continue."
echo ""
echo "📋 Current migration status:"
$PRISMA_CMD migrate status --schema prisma/schema.prisma || true
echo ""
echo "Please check the migration logs above for details."
echo ""
exit 1

