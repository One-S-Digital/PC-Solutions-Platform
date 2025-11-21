# Product Supplier – Add Product Workflow Plan

## 1. Goals & Scope
- Replace the placeholder “Add Product” button on the Product Supplier role page with a full workflow equivalent to the Service Provider service form.
- Capture the metadata daycares require (compliance, logistics, pricing tiers, variants) and surface it through the marketplace & supplier dashboards.
- Keep Render/CI builds healthy by updating Prisma schema, migrations, and the existing prebuild script that auto-heals broken deployments.

## 2. Experience Overview
- **Entry points:** Supplier dashboard widget CTA + `/supplier/product-listings` Add button.
- **Flow:** Open a multi-step modal/drawer → fill required sections → upload media/docs → submit → see card updated in listings.
- **Reuse patterns:** Mirror `ServiceUploadModal` focus/validation, `ChipInput`, `FileUploadZone`, progress indicators, and success toasts.
- **Draft handling:** Persist form state locally; allow duplicate-from-existing for similar SKUs.

## 3. Prisma & Data Model
### Schema updates (`api/prisma/schema.prisma`)
- Extend `Product` with the exact fields shipped in this PR:
  - **Essentials:** `subtitle`, `description`, `primaryCategory`, `categories String[] @default([])`, `tags String[] @default([])`, `productHighlights String[] @default([])`, `unitOfMeasure`.
  - **Lifecycle:** `status` (legacy string), `availabilityStatus ProductAvailabilityStatus @default(ACTIVE)`, `isActive Boolean @default(true)`.
  - **Pricing & inventory:** `price`, `priceCurrency @default("CHF")`, `minOrderQuantity`, `maxOrderQuantity`, `stockStatus`, `deliveryLeadTimeDays`, `restockCadence`, `volumePricing Json?`, `variants Json?`.
  - **Logistics & compliance:** `deliveryMethods String[] @default([])`, `deliveryFees Json?`, `supportedCantons String[] @default([])`, `visibilityStart`, `visibilityEnd`, `usageNotes`, `packagingDetails`, `materials`, `complianceTags String[] @default([])`, `allergens String[] @default([])`, `ageRanges String[] @default([])`.
  - **Catalog metadata:** `sku`, `vendorSku`, `ean`, `primaryCategory`, `galleryAssetIds String[] @default([])`, `imageAssetId`, `specSheetAssetId`, `msdsAssetId`.
  - **Relationships:** keep `supplierId` relation + optional `imageAsset` relation for the hero asset.
- Add the `ProductAvailabilityStatus` enum (`ACTIVE | INACTIVE | DRAFT | OUT_OF_STOCK`) and re-use it consistently in DTOs/frontend types.

### Migration workflow
1. Generate the concrete migration that now lives at `api/prisma/migrations/20251120120000_expand_product_metadata` (`pnpm --filter api prisma migrate dev --name expand_product_metadata` during local work).
2. Run `pnpm --filter api prisma generate` (or `turbo run build --filter=api`) so the new Prisma client includes the enum + fields.
3. Seed data remains optional; use `prisma studio` for ad-hoc QA records that exercise variants, delivery fees, and compliance tags.

## 4. Prebuild & DB Wiring
- Existing script: `api/scripts/prebuild-db-setup.mjs` (invoked by the `api` package `prebuild` hook) auto-heals failed or skipped migrations.
- Add a dedicated handler for `20251120120000_expand_product_metadata` that:
  - Creates the `ProductAvailabilityStatus` enum when missing.
  - Runs the same `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements as the Prisma migration to backfill columns safely.
  - Marks the migration as applied via the script’s `resolveMigration` helper.
- Required env vars: `DATABASE_URL` (for migrations/healing) and `SHADOW_DATABASE_URL` when running `prisma migrate dev` locally.
- Recommended verification commands:
  - `pnpm --filter api prisma migrate status`
  - `pnpm --filter api prisma migrate deploy`
  - `pnpm --filter api prisma generate`
- Only fall back to `pnpm --filter api prisma db push` for ephemeral preview environments where schema drift is acceptable.

## 5. Backend API Enhancements
- **DTOs (`api/src/marketplace/dto/create-product.dto.ts`):**
  - Capture every new field with `class-validator` decorators (length, numeric ranges, enums).
  - Nested DTOs: `VolumePricingTierDto`, `DeliveryFeeDto`, `ProductVariantDto`.
  - Arrays validated with `@IsArray()` + `@ValidateNested({ each: true })` so malformed payloads are rejected.
  - `UpdateProductDto` simply extends `PartialType(CreateProductDto)` to stay in sync.
- **Service (`api/src/marketplace/marketplace.service.ts`):**
  - Expand `findAllProducts` filters using `Prisma.ProductWhereInput` so category/primaryCategory/array matches, SKU/EAN-style searches, and supplier scoping compose cleanly.
  - Always include `supplier` + `imageAsset` to satisfy the supplier dashboard needs.
- **Controller (existing marketplace routes):**
  - Reuse `POST /marketplace/products`, `PATCH /marketplace/products/:id`, `DELETE /marketplace/products/:id`, and `GET /marketplace/products` for supplier CRUD plus listing.
  - Guard routes with supplier role policies (already wired in the module) and ensure `supplierId` is injected server-side where possible.
- **Testing:** extend the DTO unit tests and marketplace service specs to cover new shapes (volume pricing, variants, delivery fees). Add e2e coverage for create/update/toggle flows when time allows.

## 6. Frontend Implementation
- **Types & constants:**
  - Extend `frontend/types.ts` with the richer `Product` interface, related helper types (`ProductAvailabilityStatus`, `AssetSummary`, variant/pricing structures), and reuse existing unions like `StockStatus`.
  - Add suggested chip lists (`SUGGESTED_PRODUCT_COMPLIANCE_TAGS`, `SUGGESTED_PRODUCT_AGE_RANGES`, `SUGGESTED_PRODUCT_DELIVERY_METHODS`) in `frontend/constants.ts`.
- **Supplier listings page (`frontend/pages/supplier/SupplierProductListingsPage.tsx`):**
  - Fetch live data from `/marketplace/products?supplierId=...`, show loading/error notifications, and expose client-side search.
  - Surface CRUD actions (create, edit, visibility toggle, delete) with optimistic UI updates and fallbacks to `loadProducts()`.
  - Wire the “Add product” CTA + row actions to open the modal pre-filled with the selected product.
- **`ProductUploadModal`:**
  - New multi-section modal covering basics, categories/compliance, pricing/inventory, logistics/delivery, and media/document uploads.
  - Uses `ChipInput`, `FileUploadZone`, nested repeaters for volume pricing, variants, and delivery fees, and hydrates from existing product data.
  - Includes accessibility fixes (close button labels, aria-labels for destructive buttons) and keeps the submit button inside the `<form>` so native submission works.
- **Translations:** extend `packages/translations/locales/*/dashboard.json` with `supplierProductListingsPage` notices and `productUploadModal.*`, plus add `common.buttons.refresh` and `common.order.*` keys for new toasts and alerts.

## 7. Testing & QA
- **Backend:** unit + e2e covering product create/update/delete, validation edge cases, filtering.
- **Frontend:** component tests for modal state reducers; integration test (Cypress/Playwright if available) covering add product → listing update flow.
- **Manual QA:** 
  1. `pnpm --filter api start:dev` and `pnpm --filter frontend dev`.  
  2. Login as Product Supplier, create product covering all sections.  
  3. Switch to Foundation role, verify listing + detail view (pricing tiers, compliance).  
  4. Add product to cart to ensure existing flows handle new fields.
- **Regression:** confirm Service Provider flows unaffected; shared components must remain backwards compatible.

## 8. Rollout & Documentation
- Update `DEPLOYMENT_CHECKLIST.md` / release notes to call out the `20251120120000_expand_product_metadata` migration, the prebuild auto-heal, and the new supplier UI.
- Document supplier onboarding (required assets, recommended metadata) in `docs/onboarding-guide.md`.
- Share this plan plus the updated API contract with dependent teams (marketplace consumers, reporting) so they can start ingesting the richer product data.
