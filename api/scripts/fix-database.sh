#!/bin/bash

echo "🔧 Database recovery script starting..."

# First, try to reset the migration state
echo "1️⃣ Resetting migration tracking..."
npx prisma migrate resolve --applied "0_init" 2>/dev/null || echo "   No init migration to resolve"

# Mark all migrations as rolled back to force re-application
echo "2️⃣ Clearing migration state..."
MIGRATIONS=$(find ./prisma/migrations -maxdepth 1 -type d -name "*_*" | sort)
for migration_dir in $MIGRATIONS; do
    migration_name=$(basename "$migration_dir")
    echo "   Marking $migration_name as rolled back..."
    npx prisma migrate resolve --rolled-back "$migration_name" 2>/dev/null || true
done

# Now deploy all migrations fresh
echo "3️⃣ Deploying all migrations..."
npx prisma migrate deploy || {
    echo "❌ Migration deployment failed"
    echo "4️⃣ Attempting force sync with db push..."
    npx prisma db push --force-reset --accept-data-loss --skip-generate || {
        echo "❌ Database is in unrecoverable state"
        exit 1
    }
}

echo "✅ Database recovery complete!"
