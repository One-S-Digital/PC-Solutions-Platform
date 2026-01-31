-- Clear legacy hard-coded minimum order values for suppliers.
-- Some suppliers were seeing a default of 500; make it unset by default.

UPDATE "public"."organizations"
SET "minimumOrderQuantity" = NULL
WHERE "type" = 'PRODUCT_SUPPLIER'
  AND "minimumOrderQuantity" = 500
  -- Safeguard: only clear rows that were never updated after creation.
  AND "updatedAt" = "createdAt";

