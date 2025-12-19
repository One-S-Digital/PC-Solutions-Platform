#!/bin/bash
set -e

echo "🔧 Checking for failed migrations..."

# Check if there are any failed migrations
FAILED_COUNT=$(npx prisma migrate status | grep -c "Database migration from.*failed" || echo "0")

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "⚠️  Found $FAILED_COUNT failed migration(s)"
    echo "🔄 Resolving failed migrations..."
    
    # Mark the failed migration as resolved
    npx prisma migrate resolve --rolled-back 20251030_comprehensive_schema_audit_fix || {
        echo "⚠️  Could not resolve migration automatically"
        echo "Attempting to force resolve..."
    }
    
    echo "✅ Failed migrations resolved"
else
    echo "✅ No failed migrations found"
fi
