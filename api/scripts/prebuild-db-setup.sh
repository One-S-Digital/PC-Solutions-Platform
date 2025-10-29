#!/bin/bash

echo "🔧 Pre-build database setup script"

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set - skipping database operations"
    echo "This is normal for build environments where database is not available"
    exit 0
fi

# Check if we're in a build environment
if [ "$NODE_ENV" = "production" ] && [ -n "$DATABASE_URL" ]; then
    echo "🏗️  Production build detected with database URL"
    
    # Wait for database to be ready
    echo "🔍 Checking database connection..."
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ Database connection successful"
            break
        else
            echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
            sleep 2
            attempt=$((attempt + 1))
        fi
    done

    if [ $attempt -le $max_attempts ]; then
        echo "🔄 Running database migrations..."
        if npx prisma migrate deploy; then
            echo "✅ Database migrations completed successfully"
        else
            echo "❌ Database migration failed"
            exit 1
        fi
    else
        echo "⚠️  Database not available during build - migrations will run at startup"
    fi
else
    echo "ℹ️  Skipping database operations (not production or no DATABASE_URL)"
fi

echo "✅ Pre-build database setup complete"