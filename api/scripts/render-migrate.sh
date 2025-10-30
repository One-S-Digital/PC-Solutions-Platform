#!/bin/bash
set -e

echo "🚀 Render deployment migration script"

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set! Cannot run migrations."
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check migration status
echo "📋 Checking migration status..."
npx prisma migrate status || true

# =====================================================================
# STEP 1: Resolve ghost migrations that don't exist locally
# =====================================================================
echo ""
echo "🔧 Resolving ghost migrations..."

# These migrations appear in the database but don't exist locally
# We need to mark them as applied so Prisma stops looking for them
GHOST_MIGRATIONS=(
    "20250926_unify_asset_appuser"
    "20251017_add_firstname_lastname_to_appuser"
)

for migration in "${GHOST_MIGRATIONS[@]}"; do
    echo "📝 Marking $migration as applied (if it exists in DB)..."
    npx prisma migrate resolve --applied "$migration" 2>&1 | grep -v "Could not find" || true
done

# =====================================================================
# STEP 2: Resolve any failed migrations
# =====================================================================
echo ""
echo "🔧 Checking for failed migrations..."

# Mark the comprehensive schema audit as rolled back if it failed
echo "📝 Resolving failed migration (if exists)..."
npx prisma migrate resolve --rolled-back "20251030_comprehensive_schema_audit_fix" 2>&1 | grep -v "Could not find" || true

# =====================================================================
# STEP 3: Deploy database migrations
# =====================================================================
echo ""
echo "🔄 Deploying database migrations..."
set +e  # Don't exit on error, we want to check what went wrong

npx prisma migrate deploy
DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Migration deployment failed"
    echo "📋 Checking what went wrong..."
    npx prisma migrate status
    exit 1
fi

set -e  # Re-enable exit on error

# =====================================================================
# STEP 4: Verify database connection
# =====================================================================
echo ""
echo "🔍 Verifying database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection verified"
else
    echo "❌ Database connection verification failed"
    exit 1
fi

echo ""
echo "✨ Migration process complete!"