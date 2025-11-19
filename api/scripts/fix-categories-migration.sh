#!/bin/bash
set -euo pipefail

echo "🔧 Fixing categories migration..."

if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

# First, try to mark the failed migration as rolled back
echo "📋 Marking failed migration as rolled back..."
npx prisma migrate resolve --rolled-back "20251119100000_add_categories_array_fields" || {
    echo "⚠️  Migration not found in failed state, continuing..."
}

# Execute the SQL to ensure columns exist
echo "🔄 Ensuring category columns exist..."
npx prisma db execute --stdin << 'EOF'
DO $$
BEGIN
    -- Add categories column to products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added categories column to products table';
        
        -- Migrate existing data
        UPDATE "products" SET "categories" = ARRAY[category] 
        WHERE "category" IS NOT NULL AND "category" != '';
        RAISE NOTICE 'Migrated existing product categories';
    ELSE
        RAISE NOTICE 'Categories column already exists in products table';
    END IF;

    -- Add categories column to services table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "services" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added categories column to services table';
        
        -- Migrate existing data
        UPDATE "services" SET "categories" = ARRAY[category::text] 
        WHERE "category" IS NOT NULL;
        RAISE NOTICE 'Migrated existing service categories';
    ELSE
        RAISE NOTICE 'Categories column already exists in services table';
    END IF;

    -- Add productCategories column to organizations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'productCategories'
    ) THEN
        ALTER TABLE "organizations" ADD COLUMN "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added productCategories column to organizations table';
        
        -- Migrate existing data
        UPDATE "organizations" SET "productCategories" = ARRAY[productCategory] 
        WHERE "productCategory" IS NOT NULL AND "productCategory" != '';
        RAISE NOTICE 'Migrated existing organization product categories';
    ELSE
        RAISE NOTICE 'productCategories column already exists in organizations table';
    END IF;
END
$$;
EOF

# Mark the migration as applied
echo "✅ Marking migration as applied..."
npx prisma migrate resolve --applied "20251119100000_add_categories_array_fields"

echo "✅ Categories migration fixed successfully!"
