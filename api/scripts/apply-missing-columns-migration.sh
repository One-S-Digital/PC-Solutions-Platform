#!/bin/bash
set -e

echo "=================================================="
echo "Applying Organization Asset Columns Migration"
echo "=================================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it to your PostgreSQL connection string"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Change to api directory
cd "$(dirname "$0")/.."
echo "📂 Working directory: $(pwd)"
echo ""

# Apply the specific migration
echo "🔄 Applying migration: 20251115_add_organization_asset_columns"
echo ""

psql "$DATABASE_URL" -f prisma/migrations/20251115_add_organization_asset_columns/migration.sql

echo ""
echo "✅ Migration applied successfully!"
echo ""

# Regenerate Prisma client
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo ""
echo "=================================================="
echo "✅ Migration Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test service provider profile creation"
echo "2. Verify no P2022 errors in logs"
echo "3. Check that profiles save successfully"
echo ""
