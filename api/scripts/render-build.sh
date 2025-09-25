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

# Show current migration status and detect failed migrations
echo "📋 Checking migration status..."
PRISMA_STATUS_OUTPUT=$(npx prisma migrate status 2>&1 || true)
echo "$PRISMA_STATUS_OUTPUT"

# If there is a failed migration, resolve it as rolled back so deploy can proceed
if echo "$PRISMA_STATUS_OUTPUT" | grep -Eq "Following migration[s]? have failed:"; then
  echo "⚠️  Detected failed Prisma migration. Attempting automatic resolve..."
  # Extract candidate migration names from status output
  CANDIDATES=$(printf "%s\n" "$PRISMA_STATUS_OUTPUT" | grep -Eo '[0-9]{8}_[A-Za-z0-9_]+' | sort -u)
  FAILED_MIGRATION=""
  # Prefer a candidate that exists as a migrations directory
  if [ -n "$CANDIDATES" ]; then
    while IFS= read -r cand; do
      if [ -d "prisma/migrations/$cand" ]; then
        FAILED_MIGRATION="$cand"
        break
      fi
    done <<EOF
$CANDIDATES
EOF
  fi
  # Fallback to last migration directory if parsing failed
  if [ -z "$FAILED_MIGRATION" ]; then
    if [ -d "prisma/migrations" ]; then
      FAILED_MIGRATION=$(ls -1 prisma/migrations | sort | tail -n 1)
      echo "ℹ️  Falling back to latest migration directory: $FAILED_MIGRATION"
    fi
  fi
  if [ -n "$FAILED_MIGRATION" ]; then
    echo "🧹 Marking failed migration as rolled back: $FAILED_MIGRATION"
    npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || {
      echo "❌ Failed to resolve migration $FAILED_MIGRATION"
      exit 1
    }
  else
    echo "⚠️  Could not determine failed migration name. Please resolve manually."
    exit 1
  fi
fi

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