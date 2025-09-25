#!/bin/bash

# Test Environment Setup Script
set -e

echo "🚀 Setting up test environment for role system..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo -e "${YELLOW}⚠️  .env.test not found. Creating from template...${NC}"
    cat > .env.test << EOF
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pcdb_test?schema=public"

# Clerk (Replace with your test values)
CLERK_SECRET_KEY="sk_test_YOUR_KEY"
CLERK_WEBHOOK_SECRET="whsec_YOUR_SECRET"
CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
CLERK_ISSUER="https://your-instance.clerk.accounts.dev"

# App
PORT=3001
NODE_ENV=test
EOF
    echo -e "${YELLOW}📝 Please update .env.test with your actual Clerk credentials${NC}"
    exit 1
fi

# Load test environment
export $(cat .env.test | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"

# Check PostgreSQL connection
echo "🔍 Checking database connection..."
if ! PGPASSWORD="${DATABASE_PASSWORD:-postgres}" psql -h "${DATABASE_HOST:-localhost}" -U "${DATABASE_USER:-postgres}" -lqt | cut -d \| -f 1 | grep -qw "${DATABASE_NAME:-pcdb_test}"; then
    echo -e "${YELLOW}📦 Creating test database...${NC}"
    PGPASSWORD="${DATABASE_PASSWORD:-postgres}" createdb -h "${DATABASE_HOST:-localhost}" -U "${DATABASE_USER:-postgres}" "${DATABASE_NAME:-pcdb_test}" || true
fi

# Run migrations
echo "🔧 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database setup complete"

# Generate Prisma client
echo "🏗️  Generating Prisma client..."
npx prisma generate

# Create test data
echo "🌱 Seeding test data..."
npx ts-node scripts/test-seed.ts

echo -e "${GREEN}✨ Test environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run unit tests: npm run test:unit"
echo "2. Run integration tests: npm run test:integration"
echo "3. Start test server: npm run start:test"