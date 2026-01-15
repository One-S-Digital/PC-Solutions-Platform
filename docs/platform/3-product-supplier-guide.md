# Product Supplier User Guide

Complete guide for product suppliers using the ProCrèche Solutions platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Subscription Requirements](#subscription-requirements)
3. [Dashboard](#dashboard)
4. [Product Management](#product-management)
5. [Order Management](#order-management)
6. [Inquiry Management](#inquiry-management)
7. [Catalog Management](#catalog-management)
8. [Promo Codes](#promo-codes)
9. [Organization Profile](#organization-profile)
10. [Analytics](#analytics)
11. [Support](#support)

---

## Overview

Product suppliers can list products, manage orders, respond to inquiries, and track performance through the platform.

**Subscription Required:** Yes - Product suppliers must have an active subscription.

**Available Plans:**
- **Supplier Plan** - Full access to product management, orders, and analytics

---

## Subscription Requirements

### Subscription Status

Product suppliers require an active subscription to access:
- Dashboard
- Product listings
- Order management
- Inquiry management
- Analytics

**Always Available:**
- Settings
- Profile management
- Support tickets

### Checking Subscription

1. Navigate to **Settings** → **Billing & Subscription**
2. View current plan and status

---

## Dashboard

### Accessing Dashboard

Navigate to `/supplier/dashboard` or click **Dashboard** in the menu.

**File Reference:**
- `frontend/pages/supplier/SupplierDashboardPage.tsx`

### Dashboard Features

#### Quick Stats
- Total products
- Active products
- Total orders
- Pending orders
- Total inquiries
- Pending inquiries

#### Product Statistics
- Products by category
- Best-selling products
- Product views

#### Order Statistics
- Orders by status
- Revenue metrics
- Order trends

#### Inquiry Statistics
- Total inquiries
- Inquiries by status
- Response rate

---

## Product Management

### Accessing Product Listings

Navigate to `/supplier/product-listings` or click **Product Listings** in the supplier menu.

**File Reference:**
- `frontend/pages/supplier/SupplierProductListingsPage.tsx`

### Creating Products

1. Go to **Product Listings**
2. Click **Create Product**
3. Fill in product details:
   - Title
   - Subtitle (optional)
   - Description
   - Price
   - Currency (default: CHF)
   - Category (primary and additional categories)
   - Tags
   - Product highlights
   - Unit of measure
   - SKU, Vendor SKU, EAN
   - Min/Max order quantity
   - Stock status
   - Delivery lead time
   - Product image
4. Set status:
   - **ACTIVE** - Visible in marketplace
   - **INACTIVE** - Hidden
   - **DRAFT** - Not published
   - **OUT_OF_STOCK** - Temporarily unavailable
5. Click **Save**

_API details intentionally omitted._

### Managing Products

1. View all products
2. Filter by:
   - Status
   - Category
   - Search term
3. Edit product details
4. Update product status
5. Delete products

### Product Status

- **ACTIVE** - Product is live and visible
- **INACTIVE** - Product is hidden
- **DRAFT** - Product is not published
- **OUT_OF_STOCK** - Product temporarily unavailable

### Product Categories

Products can have:
- Primary category
- Additional categories (flexible tags)
- Custom tags

---

## Order Management

### Accessing Orders

Navigate to `/supplier/orders` or click **Orders** in the supplier menu.

**File Reference:**
- `frontend/pages/supplier/SupplierOrdersPage.tsx`

### Viewing Orders

1. Go to **Orders**
2. View all orders from foundations
3. Filter by:
   - Status
   - Date range
   - Search term
4. Click order to view details

### Order Details

View order information:
- Order ID
- Foundation details
- Order items (products, quantities, prices)
- Total amount
- Order status
- Order date

### Updating Order Status

1. Open order
2. Update status:
   - **PENDING** - Order received
   - **PROCESSING** - Being prepared
   - **SHIPPED** - Sent to customer
   - **DELIVERED** - Delivered
   - **CANCELLED** - Cancelled
3. Add notes (optional)
4. Save

---

## Inquiry Management

### Accessing Inquiries

Inquiries are received from foundations who want to learn more about your products.

**File Reference:**
_API details intentionally omitted._

### Viewing Inquiries

1. Go to **Dashboard** → Inquiries section
2. Or check inquiry notifications
3. View inquiry details:
   - Foundation information
   - Subject
   - Message
   - Product interest (if specified)
   - Quantity
   - Budget
   - Urgency
   - Contact preferences

### Inquiry Status

- **NEW** - Just received
- **PENDING** - Awaiting your response
- **CONTACTED** - You've responded
- **QUOTED** - Quote provided
- **FULFILLED** - Inquiry completed
- **DECLINED** - You declined
- **CANCELLED** - Foundation cancelled

### Responding to Inquiries

1. Open inquiry
2. Review foundation's requirements
3. Click **Respond**
4. Provide:
   - Response message
   - Quote amount (if applicable)
   - Additional information
5. Update status:
   - **CONTACTED** - Initial response
   - **QUOTED** - Quote provided
   - **FULFILLED** - Inquiry completed
   - **DECLINED** - Not interested
6. Submit response

---

## Catalog Management

### Uploading Catalogs

1. Go to **Product Listings** → **Catalogs**
2. Click **Upload Catalog**
3. Choose catalog type:
   - **PDF Catalog** - PDF document
   - **CSV Catalog** - CSV file with product data
4. Upload file
5. Add title and description
6. Save

### Catalog Types

- **PDF Catalog** - PDF document with product information
- **CSV Catalog** - CSV file that can be processed to create products

---

## Promo Codes

### Creating Promo Codes

1. Go to **Settings** → **Promo Codes**
2. Click **Create Promo Code**
3. Fill in details:
   - Code (unique identifier)
   - Discount Type (Percentage, FixedAmount, FreeMinutes)
   - Value (discount amount/percentage)
   - Expiry Date
   - Max Usage (optional)
   - Description
4. Save

### Promo Code Types

- **Percentage** - Percentage discount (e.g., 10% off)
- **FixedAmount** - Fixed amount discount (e.g., CHF 50 off)
- **FreeMinutes** - Free service minutes (for service providers)

---

## Organization Profile

### Accessing Profile

Navigate to `/supplier/organisation-profile` or go to **Settings** → **Profile**.

**File Reference:**
- `frontend/pages/supplier/SupplierOrganisationProfilePage.tsx`

### Editing Profile

1. Go to **Organization Profile**
2. Edit information:
   - Organization name
   - Description
   - Contact person
   - Phone number
   - Contact email
   - VAT number
   - Regions served
   - Languages
   - Product categories
   - Minimum order quantity
   - Direct order link
   - Catalog URL
3. Upload/update:
   - Logo
   - Cover image
4. Save

### Public Profile

Your organization profile is visible to foundations browsing the marketplace.

---

## Analytics

### Accessing Analytics

Navigate to `/supplier/analytics` or click **Analytics** in the supplier menu.

**File Reference:**
- `frontend/pages/supplier/SupplierAnalyticsPage.tsx`

### Available Analytics

- Product performance
- Order statistics
- Inquiry metrics
- Revenue trends
- Customer insights

---

## Support

### Creating Support Tickets

1. Navigate to `/supplier/support`
2. Click **Create Ticket**
3. Fill in form and submit

**File Reference:**
- `frontend/pages/supplier/SupplierSupportPage.tsx`

---

## Under the Hood

### Database Models

**Key Models:**
- `Organization` - Supplier organization
- `Product` - Product listings
- `Order` - Orders received
- `Inquiry` - Inquiries from foundations
- `Catalog` - Product catalogs
- `PromoCode` - Promotional codes

**File Reference:**
- `api/prisma/schema.prisma`

---

## Next Steps

- Review [Common Features](./8-common-features-all-users.md)
- Check [Billing & Subscriptions](./9-billing-and-subscriptions.md)
- See [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md)

