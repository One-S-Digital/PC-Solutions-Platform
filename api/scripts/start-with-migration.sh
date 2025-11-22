#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PRISMA_SCHEMA_PATH="$API_DIR/prisma/schema.prisma"

cd "$API_DIR"

echo "🚀 Starting API with database migration..."

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set! Cannot run migrations."
    echo "The application will not work properly without a database."
    exit 1
fi

# Wait for database to be ready (optional, useful for Docker Compose)
echo "🔍 Checking database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if npx prisma db execute --schema "$PRISMA_SCHEMA_PATH" --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection successful"
        break
    else
        echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Database connection failed after $max_attempts attempts"
    exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy --schema "$PRISMA_SCHEMA_PATH"; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Start the application
echo "🚀 Starting API application..."
exec pnpm start:prod