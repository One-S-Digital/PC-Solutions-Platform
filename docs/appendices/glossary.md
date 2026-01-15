# Glossary

Terms and definitions used throughout the ProCrèche Solutions platform.

---

## A

**Asset** - A file uploaded to the platform (image, document, video, etc.). Stored in Cloudflare R2.

**AppUser** - Minimal user record for authentication and role management, separate from the User profile table.

---

## C

**Clerk** - Third-party authentication service used for user authentication and management.

**Conversation** - A messaging thread between users. Can be direct (1-on-1), group, or support type.

**CV** - Curriculum Vitae (resume) uploaded by educators when applying to jobs.

---

## D

**Dashboard** - Role-specific home page showing statistics, activities, and quick actions.

---

## E

**Educator** - User role for job candidates looking for positions at daycares.

**E-Learning** - Online learning platform with courses, modules, lessons, and quizzes.

---

## F

**Foundation** - User role for daycare/childcare organizations.

**Feature Flag** - System to enable/disable features for specific users or segments.

---

## I

**Inquiry** - A message from a foundation to a supplier about products (for suppliers who don't sell directly on platform).

**i18n** - Internationalization system supporting multiple languages (English, French, German).

---

## J

**Job Application** - Application submitted by an educator to a job listing.

**Job Listing** - Job posting created by a foundation.

---

## L

**Lead** - A parent enquiry submitted to find childcare. Foundations can respond to leads.

**License** - One-time payment license (legacy model, separate from subscriptions).

---

## M

**Marketplace** - Platform section where foundations can browse and purchase products and services.

**Message** - Individual message in a conversation. Can be text, file, image, or system type.

---

## O

**Order** - Purchase order placed by a foundation for products.

**Organization** - Entity representing a foundation, supplier, or service provider.

**OrganizationType** - Type of organization: FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER.

---

## P

**Parent** - User role for parents looking for childcare.

**Parent Lead** - Lead submission from a parent looking for daycare services.

**Plan** - Subscription plan (e.g., BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE).

**Product** - Item listed by a product supplier in the marketplace.

**Product Supplier** - User role for vendors selling products to daycares.

**Promo Code** - Discount code created by suppliers or service providers.

---

## R

**R2** - Cloudflare R2 object storage used for file uploads.

**Recruitment** - Platform section for job listings and candidate management.

**Role** - User role determining access and permissions (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT, ADMIN, SUPER_ADMIN).

---

## S

**Service** - Service offering listed by a service provider.

**Service Provider** - User role for companies providing services (IT, legal, accounting, training, etc.).

**Service Request** - Request from a foundation to a service provider for services.

**Subscription** - Recurring payment plan providing access to platform features.

**Subscription Request** - Request submitted by user to obtain a subscription (manual approval workflow).

**Support Ticket** - Issue or question submitted to platform support.

---

## T

**Tier** - Subscription tier level (BASIC, ESSENTIAL, PROFESSIONAL, ENTERPRISE).

**Translation** - Multi-language content support (static UI translations and dynamic entity translations).

---

## U

**User** - Individual user account with profile information.

**UserRole** - Enum defining user roles in the system.

---

## V

**Vendor Client** - Relationship tracking for discount termination workflow (tracks which daycares are active clients of vendors).

---

## W

**Webhook** - HTTP callback from Clerk to sync user data to platform database.

---

## File References

- `api/prisma/schema.prisma` - Database schema with all model definitions
- `api/src/auth/guards/roles.guard.ts` - Role definitions and access control
- `frontend/App.tsx` - Route definitions and role-based access

