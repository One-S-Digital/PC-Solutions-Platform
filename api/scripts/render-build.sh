#!/bin/bash

echo "🚀 Starting Render build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations if DATABASE_URL is set
if [ ! -z "$DATABASE_URL" ]; then
    echo "🔄 Running database migrations..."
    npx prisma migrate deploy || {
        echo "⚠️  Migration failed, but continuing build..."
    }
else
    echo "⚠️  DATABASE_URL not set, skipping migrations"
fi

echo "✨ Build preparation complete!"