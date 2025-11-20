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
- Extend `Product` with:
  - **Essentials:** `subtitle`, `primaryCategory`, `categories String[]`, `ageRanges String[]`, `unitOfMeasure`, `usageNotes`.
  - **Inventory:** `sku`, `ean`, `variantStrategy`, `minOrderQuantity`, `maxOrderQuantity`, `availabilityStatus` (enum), `leadTimeDays`, `restockCadence`, `packagingDetails`.
  - **Pricing:** `price`, `priceCurrency`, `volumePricing Json`, `subscriptionOptions Json`.
  - **Compliance:** `complianceTags String[]`, `certificationAssetIds String[]`, `allergens String[]`, `materialComposition`, `expiryDate`.
  - **Logistics:** `deliveryMethods String[]`, `deliveryFees Json`, `supportedCantons String[]`, `visibilityStart/End`.
  - **Media:** `galleryAssetIds String[]`, `specSheetAssetId`, `msdsAssetId`.
- Optional new tables:
  - `ProductVariant` (variantId, attributes Json, price, stock, assetId).
  - `ProductDocument` (type enum, assetId, productId).
- Update `@prisma/client` enums for `AvailabilityStatus`, `DeliveryMethod`, `AgeRange`.

### Migration workflow
1. `pnpm --filter api prisma migrate dev --name add_product_metadata`.
2. Update seed data with representative products (variants, compliance combos) for QA demos.
3. Regenerate Prisma client (`pnpm --filter api prisma generate`) and ensure downstream packages recompile via Turbo.

## 4. Prebuild & DB Wiring
- Existing script: `api/scripts/prebuild-db-setup.mjs` (called from `api` `prebuild` script) auto-resolves failed migrations and backfills columns.
- Extend `handleFailedMigration` with the new migration name (e.g., `20251121094500_add_product_metadata`). For skipped migrations in production, add helper SQL blocks similar to `ensureCategoriesColumns`.
- Required env vars: `DATABASE_URL` (always) and `SHADOW_DATABASE_URL` for `prisma migrate dev`. Document these in `ENVIRONMENT_SETUP.md` + deployment docs.
- Validation commands for CI/docs:
  - `pnpm --filter api db:status`
  - `pnpm --filter api db:verify`
  - `pnpm --filter api db:migrate`
- Mention fallback `pnpm --filter api prisma db push` for ephemeral preview DBs (not for prod).

## 5. Backend API Enhancements
- **DTOs (`api/src/marketplace/dto/create-product.dto.ts`):**
  - Add class-validator rules for every field (length, numeric ranges, enum membership).
  - Nested DTOs: `ProductVariantDto`, `VolumeTierDto`, `DeliveryFeeDto`, `ComplianceCertificateDto`.
  - Custom validators: `MinLessThanMax`, `DistinctArray`.
- **Service (`api/src/marketplace/marketplace.service.ts`):**
  - Persist nested relations inside `createProduct`/`updateProduct`.
  - Enforce ownership (supplier org) on write operations.
  - Enhance filters to handle arrays (category, canton, compliance) + search by SKU/EAN.
  - Add `paginate` support (skip/take from query params).
- **Controller (`api/src/marketplace/marketplace.controller.ts`):**
  - `GET /marketplace/products/supplier` – fetch supplier’s own listings.
  - `PATCH /marketplace/products/:id/status` – quick publish/unpublish toggle.
  - Ensure routes are decorated with `@Roles(UserRole.PRODUCT_SUPPLIER, ...)`.
- **Testing:** add unit tests for DTO validation and service logic (mock Prisma). Extend e2e specs to cover nested payloads.

## 6. Frontend Implementation
- **Types & Services:**
  - Update `frontend/types.ts` with the expanded `Product` shape plus helper interfaces for variants/pricing.
  - New `frontend/services/productService.ts` using `useAuthenticatedApi` to hit the new endpoints. Provide React Query hooks (`useSupplierProducts`, `useProductMutation`).
- **Product listings page (`frontend/pages/supplier/ProductListingsPage.tsx`):**
  - Replace mock data with API fetch; show loading/empty states.
  - Wire “Add product” button to the new modal.
- **`ProductUploadModal`:**
  - Base on `ServiceUploadModal` but split into sections (Essentials, Inventory, Pricing, Compliance, Logistics, Media).
  - Use `ChipInput` seeded by `SUGGESTED_PRODUCT_CATEGORIES`, allow custom values.
  - Variant builder subcomponent (dynamic rows with per-variant price/stock/images).
  - Volume pricing editor (threshold + price). Validate ascending thresholds.
  - Compliance toggles (chips for EN-71, CE, fire-retardant, allergen-free, organic, etc.) + optional asset uploads for certificates or MSDS.
  - Delivery coverage uses canton chips; delivery fee matrix per method.
  - Provide summary sidebar showing readiness per section.
- **Marketplace display:**
  - Update supplier cards/product cards to show new badges (age range, compliance tags, MOQ).
  - Filter UI additions (category multi-select, compliance, canton).
- **Translations:** add `productUploadModal.*` keys to `packages/translations/locales/*/dashboard.json`. Run `pnpm translate:simple` if needed.

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
- Update `DEPLOYMENT_CHECKLIST.md` and `RELEASE_NOTES` (if any) to mention the new feature, migration, and prebuild safeguards.
- Add onboarding instructions for suppliers in `docs/onboarding-guide.md` (steps to add first product, required docs).
- Communicate schema/API changes to frontend team via this doc + Slack/Notion as needed.
