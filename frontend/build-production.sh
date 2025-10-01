#!/bin/bash
# build-production.sh

set -e

echo "🚀 Starting production build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.vite/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Type check
echo "🔍 Running type check..."
npm run type-check

# Lint check
echo "🔍 Running lint check..."
npm run lint

# Build for production
echo "🏗️ Building for production..."
npm run build:production

# Verify build
echo "✅ Verifying build..."
if [ -d "dist" ]; then
    echo "✅ Build successful - dist/ directory created"
    ls -la dist/
else
    echo "❌ Build failed - dist/ directory not found"
    exit 1
fi

# Check bundle sizes
echo "📊 Bundle size analysis..."
du -sh dist/assets/*.js | sort -hr

echo "🎉 Production build completed successfully!"