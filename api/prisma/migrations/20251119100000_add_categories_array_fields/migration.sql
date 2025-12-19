-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: copy single category to categories array for products
UPDATE "products" SET "categories" = ARRAY[category] WHERE "category" IS NOT NULL AND "category" != '';

-- Migrate existing data: copy single category to categories array for services
UPDATE "services" SET "categories" = ARRAY[category::text] WHERE "category" IS NOT NULL;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data: copy single productCategory to productCategories array for organizations
UPDATE "organizations" SET "productCategories" = ARRAY["productCategory"] WHERE "productCategory" IS NOT NULL AND "productCategory" != '';
