#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCHEMA_PATH="${PROJECT_ROOT}/prisma/schema.prisma"

cd "${PROJECT_ROOT}"

echo "🔧 Running database pre-build cleanup..."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "⚠️  DATABASE_URL not set. Skipping database pre-build tasks."
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "⚠️  psql client is not available. Skipping automatic migration resolution."
  exit 0
fi

ensure_metadata_column() {
  npx prisma db execute --schema "${SCHEMA_PATH}" --stdin <<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assets'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "assets"
        ADD COLUMN "metadata" JSONB;
    END IF;
END
$$;
SQL
}

resolve_migration_state() {
  local action=$1
  local migration=$2

  if [[ -d "prisma/migrations/${migration}" ]]; then
    npx prisma migrate resolve "--${action}" "${migration}" --schema "${SCHEMA_PATH}" >/dev/null 2>&1 || true
    echo "   ↳ Marked ${migration} as ${action}"
  fi
}

FAILED_MIGRATIONS=$(
  psql "${DATABASE_URL}" \
    -X -A -t \
    -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL"
)

if [[ -z "${FAILED_MIGRATIONS// }" ]]; then
  echo "✅ No failed migrations detected."
else
  echo "❗ Detected failed migrations. Attempting automatic cleanup..."
  while IFS= read -r migration; do
    [[ -z "${migration}" ]] && continue

    case "${migration}" in
      20251104140358_add_asset_metadata_field)
        echo "   • Resolving ${migration} (metadata column migration)"
        ensure_metadata_column
        resolve_migration_state applied "${migration}"
        ;;
      *)
        echo "   • Rolling back failed migration ${migration}"
        resolve_migration_state rolled-back "${migration}"
        ;;
    esac
  done <<< "${FAILED_MIGRATIONS}"
fi

echo "✅ Database pre-build cleanup complete."