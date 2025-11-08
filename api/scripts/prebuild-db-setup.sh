#!/bin/bash
set -e

echo "🔧 Pre-build setup..."

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set - skipping Prisma migrations during build"
else
  echo "🔄 Running Prisma migrations via prisma migrate deploy..."
  npx prisma migrate deploy
  echo "✅ Prisma migrations completed"
fi

echo "✅ Pre-build setup complete"
exit 0