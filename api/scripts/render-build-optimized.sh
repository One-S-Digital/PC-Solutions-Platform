#!/bin/bash
set -euo pipefail

echo "🚀 Starting optimized Render build process..."

# Navigate to root for filtered install
cd "$(dirname "$0")/../.."

echo "📦 Installing only API dependencies (filtered install)..."
# Install only api and required workspace packages
# This significantly reduces cache size and installation time
pnpm install --frozen-lockfile --filter=api --filter=@workspace/types --prod

echo "✅ Filtered install complete, proceeding with build..."

# Now run the regular build process from api directory
cd api
exec ./scripts/render-build.sh
