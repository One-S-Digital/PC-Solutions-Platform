#!/bin/bash

echo "🚀 Starting application on Render..."

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set! Cannot start application."
    exit 1
fi

# Run database migrations at startup
echo "🔄 Running database migrations..."
npx prisma migrate deploy 2>&1 || {
    echo "⚠️  Migration failed, but continuing startup..."
    echo "The application may not work properly if migrations are pending."
}

# Start the application
echo "✨ Starting NestJS application..."
exec node dist/main.js
