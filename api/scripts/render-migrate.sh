#!/bin/bash

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
npx prisma migrate status

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Verify database connection
echo "🔍 Verifying database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection verified"
else
    echo "❌ Database connection verification failed"
    exit 1
fi

echo "✨ Migration process complete!"