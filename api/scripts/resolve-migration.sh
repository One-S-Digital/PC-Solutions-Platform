#!/bin/bash

# Migration Resolution Script for Production
# This script resolves the failed migration state in production

echo "🔧 Starting migration resolution process..."

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
    echo "🚨 Production environment detected"
    
    # First, let's check the migration status
    echo "📊 Checking migration status..."
    npx prisma migrate status
    
    # Try to resolve the failed migration
    echo "🔄 Attempting to resolve failed migration..."
    npx prisma migrate resolve --applied 20250926_unify_asset_appuser
    
    # Now try to deploy the new migration
    echo "🚀 Deploying new migration..."
    npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration resolved and deployed successfully!"
    else
        echo "❌ Migration deployment failed. Trying alternative approach..."
        
        # Alternative: Mark the failed migration as rolled back
        echo "🔄 Marking failed migration as rolled back..."
        npx prisma migrate resolve --rolled-back 20250926_unify_asset_appuser
        
        # Try to deploy again
        echo "🚀 Attempting deployment again..."
        npx prisma migrate deploy
        
        if [ $? -eq 0 ]; then
            echo "✅ Migration resolved and deployed successfully!"
        else
            echo "❌ All migration attempts failed. Manual intervention required."
            echo "💡 Consider running: npx prisma migrate reset --force"
            exit 1
        fi
    fi
else
    echo "🔧 Development environment detected"
    echo "🚀 Running standard migration..."
    npx prisma migrate deploy
fi

echo "🎉 Migration process completed!"