#!/bin/bash

echo "🚀 Starting Render build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate || {
    echo "❌ Failed to generate Prisma client"
    exit 1
}

# Run database migrations if DATABASE_URL is set
if [ ! -z "$DATABASE_URL" ]; then
    echo "🔄 Running database migrations..."
    npx prisma migrate deploy || {
        echo "❌ Migration failed! This is critical for the application to work."
        echo "Please check:"
        echo "1. DATABASE_URL is correctly set"
        echo "2. Database is accessible"
        echo "3. Migration files exist in prisma/migrations"
        exit 1
    }
    echo "✅ Database migrations completed successfully"
else
    echo "❌ DATABASE_URL not set! Database migrations cannot run."
    echo "The application will not work properly without a database."
    exit 1
fi

echo "✨ Build preparation complete!"