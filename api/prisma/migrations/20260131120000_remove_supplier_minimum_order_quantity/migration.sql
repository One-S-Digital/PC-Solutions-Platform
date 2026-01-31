-- Remove supplier minimum order quantity values that were previously set.
-- This disables any org-level minimum order display/usage for suppliers.

UPDATE "public"."organizations"
SET "minimumOrderQuantity" = NULL
WHERE "type" = 'PRODUCT_SUPPLIER';

