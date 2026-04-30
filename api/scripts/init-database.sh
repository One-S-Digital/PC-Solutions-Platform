#!/bin/bash

echo "🚀 Initializing database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🧩 Ensuring required Postgres extensions exist (pgcrypto)..."
# Required for migrations using gen_random_uuid()
if ! npx prisma db execute --schema ./prisma/schema.prisma --stdin <<< 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";' >/dev/null 2>&1; then
    echo "❌ Failed to enable pgcrypto extension."
    echo "Your DB user likely lacks CREATE EXTENSION privileges."
    exit 1
fi

echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Database initialized successfully!"
else
    echo "❌ Failed to run migrations"
    exit 1
fi

echo "🌱 Checking if we need to seed initial data..."
# You can add seed commands here if needed
# npx prisma db seed

echo "✨ Database setup complete!"