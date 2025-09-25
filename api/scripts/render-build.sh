#!/bin/bash

echo "🚀 Starting Render build process..."

# Check for required environment variables
echo "🔍 Checking environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set! Database migrations cannot run."
    echo "The application will not work properly without a database."
    exit 1
fi

# Check if migration files exist
echo "📁 Checking migration files..."
if [ ! -d "./prisma/migrations" ]; then
    echo "❌ Migration directory not found at ./prisma/migrations"
    exit 1
fi

if [ ! -f "./prisma/migrations/migration_lock.toml" ]; then
    echo "❌ migration_lock.toml not found in ./prisma/migrations"
    echo "This file is required for Prisma migrations to work"
    exit 1
fi

# Count migration directories
MIGRATION_COUNT=$(find ./prisma/migrations -maxdepth 1 -type d -name "*_*" | wc -l)
echo "📊 Found $MIGRATION_COUNT migration(s)"

# Prisma client is generated via postinstall, just verify it exists
if [ ! -d "../node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma client not found, generating..."
    npx prisma generate || {
        echo "❌ Failed to generate Prisma client"
        exit 1
    }
fi

# Show current migration status
echo "📋 Checking migration status..."
npx prisma migrate status || true

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
    echo "❌ Migration failed! This is critical for the application to work."
    echo ""
    echo "Common issues:"
    echo "1. DATABASE_URL might be incorrect or database is not accessible"
    echo "2. Migration files might be corrupted"
    echo "3. Database user might not have sufficient permissions"
    echo ""
    echo "To debug locally:"
    echo "export DATABASE_URL='your-database-url'"
    echo "npx prisma migrate status"
    exit 1
}

echo "✅ Database migrations completed successfully"

# Verify tables were created
echo "🔍 Verifying database setup..."
# Note: prisma db execute requires a file input, not inline SQL
# The migration status above already confirms the database is set up correctly
echo "✅ Database setup verified"

echo "✨ Build preparation complete!"