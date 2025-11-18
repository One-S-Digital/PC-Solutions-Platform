#!/usr/bin/env bash
set -euo pipefail

# This script is invoked by Render/CI before building the API service.
# It ensures the API dependencies are installed and Prisma migrations
# are applied to the DATABASE_URL provided by the environment.

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "⚠️  DATABASE_URL is not set; skipping prisma migrate deploy."
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "⚠️  pnpm is not available on PATH; skipping migrations."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$API_DIR" || exit 1

echo "📦 Installing API dependencies for migrations..."
pnpm install --filter ./api --frozen-lockfile

echo "🔧 Generating Prisma client..."
pnpm prisma generate

echo "🔄 Deploying Prisma migrations..."
if ! pnpm prisma migrate deploy; then
  echo "❌ prisma migrate deploy failed; showing status..."
  pnpm prisma migrate status || true
  exit 1
fi

echo "✅ Prisma migrations completed successfully."
