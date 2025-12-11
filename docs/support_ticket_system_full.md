# SUPPORT TICKET SYSTEM – FULL DOCUMENTATION (COMPILED)

_Auto-compiled from individual documentation files._

# SUPPORT_TICKET_SYSTEM_INDEX.md

# Support Ticket System Documentation - Master Index

## Overview

This is the complete documentation for the Support Ticket System in the PC Solutions platform. The documentation is divided into four comprehensive parts, each covering different aspects of the system.

## Documentation Structure

### [Part 1: System Overview and Architecture](./SUPPORT_TICKET_SYSTEM_PART1_OVERVIEW.md)
**Purpose:** High-level understanding of the system

**Contents:**
- System overview and how it fits into the platform
- Full lifecycle flow (creation → assignment → messaging → closing)
- Architecture components and interactions
- Complete file structure with exact paths
- Main entities (Tickets, Messages, Priorities, Statuses, etc.)
- Services, hooks, API layers, controllers, and utilities

**Read this first if:**
- You're new to the codebase
- You need to understand the big picture
- You want to see how everything connects

---

### [Part 2: Technical Specifications](./SUPPORT_TICKET_SYSTEM_PART2_TECHNICAL_SPECS.md)
**Purpose:** Detailed technical implementation

**Contents:**
- **Frontend:**
  - Pages and components
  - State management patterns
  - API service layer structure
  - Pagination, sorting, and filtering
  - Error handling and validation
- **Backend:**
  - Database schema/models
  - Relations between entities
  - Controllers and routes
  - Services and business logic
  - Validation rules
  - Authentication and authorization

**Read this if:**
- You need implementation details
- You're debugging an issue
- You want to understand how specific features work

---

### [Part 3: Implementation Guide](./SUPPORT_TICKET_SYSTEM_PART3_IMPLEMENTATION_GUIDE.md)
**Purpose:** Step-by-step instructions for extending the system

**Contents:**
- Adding new fields to tickets
- Adding new statuses or priorities
- Adding new actions (escalate, reopen, internal notes)
- Adding new message types
- Code examples for each scenario

**Read this if:**
- You're adding new features
- You're modifying existing functionality
- You need code examples

---

### [Part 4: Developer Workflow and Compliance](./SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md)
**Purpose:** Strict workflow and best practices

**Contents:**
- 11-step developer workflow (must follow in order)
- Critical compliance requirements
- Common mistakes to avoid (with examples)
- Testing expectations and checklist

**Read this if:**
- You're about to make changes
- You want to avoid common pitfalls
- You need to ensure your work is complete

---

## Quick Start Guide

### For New Developers

1. **Start with Part 1** - Understand the system architecture
2. **Read Part 2** - Learn the technical details
3. **Bookmark Part 4** - Reference it before making any changes
4. **Use Part 3** - When you need to extend the system

### For Experienced Developers

1. **Skim Part 1** - Refresh on architecture
2. **Reference Part 2** - When you need specific implementation details
3. **Follow Part 4** - Strict workflow for all changes
4. **Use Part 3** - Code examples for common tasks

### For AI Agents

1. **Read all parts** - Complete understanding required
2. **Follow Part 4 workflow** - Step-by-step, no shortcuts
3. **Reference Part 3** - For code examples
4. **Verify with Part 2** - Ensure implementation matches specs

---

## Key Files Reference

### Backend
- `api/src/support/support.module.ts` - Module definition
- `api/src/support/support.controller.ts` - HTTP endpoints
- `api/src/support/support.service.ts` - Business logic
- `api/src/support/dto/support.dto.ts` - Data validation
- `api/prisma/schema.prisma` - Database schema (lines 1844-1883)

### Frontend
- `frontend/pages/foundation/FoundationSupportPage.tsx` - User ticket management
- `frontend/services/supportService.ts` - API service functions

### Admin
- `admin/src/pages/Support.tsx` - Admin ticket dashboard
- `admin/src/services/api.ts` - API service (lines 713-742)
- `admin/src/types/index.ts` - Type definitions (lines 52-107)

---

## Common Tasks Quick Reference

### Adding a New Field
1. Update schema → Create migration
2. Update DTOs → Add validation
3. Update service → Handle in create/transform
4. Update controller → Accept new field
5. Update frontend types → Add to interfaces
6. Update UI → Add form input and display
7. Test → Verify end-to-end

**See:** [Part 3: Adding New Fields](./SUPPORT_TICKET_SYSTEM_PART3_IMPLEMENTATION_GUIDE.md#adding-new-fields-to-tickets)

### Adding a New Status
1. Update backend constant → `ALLOWED_STATUSES`
2. Update DTO → `UpdateTicketStatusDto`
3. Update frontend types → `TicketStatus`
4. Update badge styling → `getTicketStatusClass()`
5. Update UI → Filter dropdowns, status change
6. Test → Verify all transitions work

**See:** [Part 3: Adding New Statuses](./SUPPORT_TICKET_SYSTEM_PART3_IMPLEMENTATION_GUIDE.md#adding-new-statuses-or-priorities)

### Adding a New Action
1. Add service method → Business logic
2. Add controller endpoint → HTTP route
3. Add frontend API function → Service layer
4. Add UI button/handler → User interface
5. Test → Verify action works

**See:** [Part 3: Adding New Actions](./SUPPORT_TICKET_SYSTEM_PART3_IMPLEMENTATION_GUIDE.md#adding-new-actions)

---

## System Entities

### SupportTicket
- **Fields:** id, userId, subject, message, category, priority, status, assignedTo, resolvedAt, createdAt, updatedAt
- **Relations:** user (creator), assignee (assigned admin), responses (array)
- **Statuses:** OPEN, IN_PROGRESS, RESOLVED, CLOSED
- **Priorities:** LOW, MEDIUM, HIGH, URGENT
- **Categories:** GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST

### TicketResponse
- **Fields:** id, ticketId, userId, message, isStaff, createdAt
- **Relations:** ticket (parent), user (creator)
- **Types:** TEXT (default), SYSTEM, ATTACHMENT, RESOLUTION (if extended)

---

## API Endpoints

### User Endpoints (Authenticated)
- `POST /support/tickets` - Create ticket
- `GET /support/tickets` - Get user's tickets
- `GET /support/tickets/:id` - Get single ticket
- `POST /support/tickets/:id/respond` - Add response

### Admin Endpoints (Require ADMIN/SUPER_ADMIN)
- `GET /support/admin/tickets` - Get all tickets (with filters)
- `PATCH /support/admin/tickets/:id/status` - Update status
- `PATCH /support/admin/tickets/:id/assign` - Assign ticket
- `GET /support/admin/stats` - Get statistics

---

## Workflow Checklist

When modifying the Support Ticket System, follow this checklist:

- [ ] Step 1: Update models/schema
- [ ] Step 2: Create and run migration
- [ ] Step 3: Update backend DTOs
- [ ] Step 4: Update backend services
- [ ] Step 5: Update controllers and endpoints
- [ ] Step 6: Update frontend API functions
- [ ] Step 7: Update admin API functions
- [ ] Step 8: Update UI components
- [ ] Step 9: Validate permission rules
- [ ] Step 10: Test ticket creation, updates, messaging, and status/priority logic
- [ ] Step 11: Run full regression on ticket list, filters, and details page

**See:** [Part 4: Developer Workflow](./SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md#developer-workflow-requirements)

---

## Compliance Requirements

**All developers MUST:**

1. ✅ Follow existing architecture patterns
2. ✅ Never bypass backend validation
3. ✅ Never hardcode logic that belongs in services/controllers
4. ✅ Never duplicate business rules in frontend
5. ✅ Always maintain correct permissions (agent vs customer)
6. ✅ Always update all dependent files when adding new fields/statuses/behaviors
7. ✅ Always fully test the end-to-end flow before calling work complete

**See:** [Part 4: Critical Compliance Requirements](./SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md#critical-compliance-requirements)

---

## Common Mistakes

1. ❌ Adding field to schema but not updating DTOs
2. ❌ Adding new status but not updating filtering UI
3. ❌ Hardcoding UI values instead of using enums
4. ❌ Forgetting to update backend validation
5. ❌ Not returning correct API shapes
6. ❌ Skipping authorization checks
7. ❌ Not testing backward compatibility

**See:** [Part 4: Common Mistakes to Avoid](./SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md#common-mistakes-to-avoid)

---

## Testing Requirements

**Minimum testing before marking work complete:**

- [ ] Ticket creation (all scenarios)
- [ ] Ticket updates (all scenarios)
- [ ] Messaging (all scenarios)
- [ ] Status/priority logic
- [ ] Authorization (all roles)
- [ ] Filters and search
- [ ] Edge cases
- [ ] Error handling
- [ ] Backward compatibility
- [ ] Performance

**See:** [Part 4: Testing Expectations](./SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md#testing-expectations)

---

## Support and Questions

If you have questions or need clarification:

1. **Check the relevant part** of this documentation
2. **Review code examples** in Part 3
3. **Follow the workflow** in Part 4
4. **Consult with the development team** if still unclear

---

## Document Version

**Last Updated:** 2024
**System Version:** Current implementation as of documentation creation
**Status:** Production-ready, comprehensive documentation

---

## Document Maintenance

This documentation should be updated when:
- New features are added to the Support Ticket System
- Architecture changes are made
- New patterns are established
- Common mistakes are discovered
- Workflow processes are refined

**Maintainers:** Development team
**Review Frequency:** After major changes to the Support Ticket System

---

**Happy Coding! 🚀**



# SUPPORT_TICKET_SYSTEM_PART1_OVERVIEW.md

# Support Ticket System Documentation - Part 1: System Overview and Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Full Lifecycle Flow](#full-lifecycle-flow)
3. [Architecture Components](#architecture-components)
4. [File Structure](#file-structure)
5. [Main Entities](#main-entities)

---

## System Overview

The Support Ticket System is a comprehensive customer support management solution integrated into the PC Solutions platform. It enables users (customers) to create support tickets, and administrators (agents) to manage, assign, respond to, and resolve these tickets.

### How It Fits Into the Platform

The Support Ticket System is a core feature that:
- Provides customer support capabilities across all user roles (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT)
- Integrates with the authentication system (Clerk) for secure access
- Uses the same database (PostgreSQL via Prisma) as the rest of the platform
- Follows the same API response patterns and error handling conventions
- Shares UI components and styling with the rest of the application

### Key Characteristics

- **Role-Based Access**: Customers can create and view their own tickets; Admins can view and manage all tickets
- **Real-Time Updates**: Ticket status changes and responses are immediately reflected
- **Multi-User Support**: Multiple admins can be assigned to tickets
- **Rich Filtering**: Admins can filter by status, priority, category, and search text
- **Statistics Dashboard**: Real-time ticket statistics for admins

---

## Full Lifecycle Flow

### 1. Ticket Creation
```
User → Frontend Form → POST /support/tickets → SupportService.createTicket() 
→ Prisma SupportTicket.create() → Database → Response with ticket data
```

**Steps:**
1. User fills out ticket form (subject, message, category, priority)
2. Frontend validates input
3. API request sent to backend with user ID from auth context
4. Backend validates data (DTO validation)
5. Ticket created in database with status='OPEN'
6. Response returned with full ticket object

### 2. Ticket Assignment
```
Admin → Admin UI → PATCH /support/admin/tickets/:id/assign → SupportService.assignTicket()
→ Prisma SupportTicket.update() → Status auto-changes to IN_PROGRESS if OPEN
```

**Steps:**
1. Admin selects ticket in admin dashboard
2. Clicks "Assign to Me" or selects assignee
3. Backend updates `assignedTo` field
4. If ticket was OPEN, status automatically changes to IN_PROGRESS
5. Ticket list refreshes to show assignment

### 3. Priority/Status Changes
```
Admin → Admin UI → PATCH /support/admin/tickets/:id/status → SupportService.updateTicketStatus()
→ Validation → Prisma SupportTicket.update() → resolvedAt set if RESOLVED/CLOSED
```

**Steps:**
1. Admin changes status dropdown
2. Backend validates status is in allowed list: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
3. If status is RESOLVED or CLOSED, `resolvedAt` timestamp is set
4. Ticket updated in database
5. UI refreshes to show new status

### 4. Messaging/Responses
```
User/Admin → Response Form → POST /support/tickets/:id/respond → SupportService.addResponse()
→ Authorization Check → Prisma TicketResponse.create() → Auto-status update if staff responds
```

**Steps:**
1. User or Admin types response message
2. Backend checks authorization (user can only respond to their own tickets; admins can respond to any)
3. Response created with `isStaff` flag based on user role
4. If staff responds to OPEN ticket, status auto-changes to IN_PROGRESS
5. Response added to ticket's responses array
6. Full ticket with updated responses returned

### 5. Closing/Reopening
```
Admin → Status Change → PATCH /support/admin/tickets/:id/status → SupportService.updateTicketStatus()
→ Status = 'CLOSED' → resolvedAt timestamp set → Ticket marked as closed
```

**Reopening:**
- Admin changes status from CLOSED back to OPEN, IN_PROGRESS, or RESOLVED
- `resolvedAt` timestamp remains (historical record)
- Ticket becomes active again

---

## Architecture Components

### Frontend-Backend Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ User Pages       │         │ Admin Dashboard   │        │
│  │ (Foundation, etc)│         │ (Support.tsx)     │        │
│  └────────┬─────────┘         └────────┬──────────┘        │
│           │                            │                    │
│  ┌────────▼────────────────────────────▼──────────┐        │
│  │         API Service Layer                       │        │
│  │  - supportService.ts (frontend)                 │        │
│  │  - api.ts (admin)                               │        │
│  └────────┬────────────────────────────────────────┘        │
└───────────┼──────────────────────────────────────────────────┘
            │ HTTP Requests (Bearer Token Auth)
            │
┌───────────▼──────────────────────────────────────────────────┐
│                        Backend API                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SupportController                             │  │
│  │  - POST   /support/tickets                            │  │
│  │  - GET    /support/tickets                            │  │
│  │  - GET    /support/tickets/:id                        │  │
│  │  - POST   /support/tickets/:id/respond               │  │
│  │  - GET    /support/admin/tickets                      │  │
│  │  - PATCH  /support/admin/tickets/:id/status          │  │
│  │  - PATCH  /support/admin/tickets/:id/assign          │  │
│  │  - GET    /support/admin/stats                        │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                         │
│  ┌───────────────▼──────────────────────────────────────┐  │
│  │         SupportService                               │  │
│  │  - createTicket()                                    │  │
│  │  - getUserTickets()                                  │  │
│  │  - getAllTickets()                                   │  │
│  │  - getTicketById()                                   │  │
│  │  - addResponse()                                     │  │
│  │  - updateTicketStatus()                              │  │
│  │  - assignTicket()                                    │  │
│  │  - getTicketStats()                                  │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                         │
│  ┌───────────────▼──────────────────────────────────────┐  │
│  │         PrismaService                                │  │
│  │  - Database Operations                                │  │
│  └───────────────┬──────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │   PostgreSQL      │
         │  - support_tickets│
         │  - ticket_responses│
         └───────────────────┘
```

---

## File Structure

### Backend Files

```
api/
├── src/
│   └── support/
│       ├── support.module.ts          # NestJS module definition
│       ├── support.controller.ts      # HTTP endpoints and routing
│       ├── support.service.ts         # Business logic and database operations
│       └── dto/
│           └── support.dto.ts         # Data Transfer Objects (validation)
│
└── prisma/
    └── schema.prisma                  # Database schema (SupportTicket, TicketResponse models)
```

**Exact File Paths:**
- `api/src/support/support.module.ts`
- `api/src/support/support.controller.ts`
- `api/src/support/support.service.ts`
- `api/src/support/dto/support.dto.ts`
- `api/prisma/schema.prisma` (lines 1844-1883)

### Frontend Files

```
frontend/
├── pages/
│   └── foundation/
│       └── FoundationSupportPage.tsx  # User-facing ticket management page
│
└── services/
    └── supportService.ts               # API service functions and types
```

**Exact File Paths:**
- `frontend/pages/foundation/FoundationSupportPage.tsx`
- `frontend/services/supportService.ts`

### Admin Dashboard Files

```
admin/
├── src/
│   ├── pages/
│   │   └── Support.tsx                # Admin ticket management interface
│   ├── services/
│   │   └── api.ts                      # API service functions (lines 713-742)
│   └── types/
│       └── index.ts                     # TypeScript type definitions (lines 52-107)
```

**Exact File Paths:**
- `admin/src/pages/Support.tsx`
- `admin/src/services/api.ts` (support ticket functions at lines 713-742)
- `admin/src/types/index.ts` (support ticket types at lines 52-107)

---

## Main Entities

### 1. Tickets (SupportTicket)

**Database Model** (`api/prisma/schema.prisma`):
```prisma
model SupportTicket {
  id          String    @id @default(uuid())
  userId      String                                    // Creator of the ticket
  subject     String                                    // Ticket subject line
  message     String    @db.Text                        // Initial message
  category    String    @default("GENERAL")            // GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST
  priority    String    @default("MEDIUM")             // LOW, MEDIUM, HIGH, URGENT
  status      String    @default("OPEN")               // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  assignedTo  String?                                   // Admin user ID (nullable)
  resolvedAt  DateTime?                                 // Timestamp when resolved/closed
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  user        User             @relation("UserSupportTickets", fields: [userId], references: [id])
  assignee    User?            @relation("AssignedSupportTickets", fields: [assignedTo], references: [id])
  responses   TicketResponse[]

  @@index([userId])
  @@index([status])
  @@index([priority])
  @@index([assignedTo])
  @@map("support_tickets")
}
```

**Key Fields:**
- `id`: Unique identifier (UUID)
- `userId`: Foreign key to User table (ticket creator)
- `subject`: Short description (5-200 characters)
- `message`: Full ticket message (10-5000 characters)
- `category`: Ticket category (enum-like string)
- `priority`: Priority level (enum-like string)
- `status`: Current status (enum-like string)
- `assignedTo`: Optional admin user ID
- `resolvedAt`: Timestamp when ticket was resolved/closed

### 2. Ticket Messages (TicketResponse)

**Database Model** (`api/prisma/schema.prisma`):
```prisma
model TicketResponse {
  id        String   @id @default(uuid())
  ticketId  String                                    // Foreign key to SupportTicket
  userId    String                                    // User who created the response
  message   String   @db.Text                         // Response message content
  isStaff   Boolean  @default(false)                 // true if admin/staff, false if customer
  createdAt DateTime @default(now())

  // Relations
  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User          @relation("UserTicketResponses", fields: [userId], references: [id])

  @@index([ticketId])
  @@map("ticket_responses")
}
```

**Key Fields:**
- `id`: Unique identifier (UUID)
- `ticketId`: Foreign key to SupportTicket
- `userId`: Foreign key to User (who wrote the response)
- `message`: Response message content (1-5000 characters)
- `isStaff`: Boolean flag indicating if response is from admin/staff
- `createdAt`: Timestamp of response

**Cascade Delete:** If a ticket is deleted, all its responses are automatically deleted.

### 3. Priorities

**Allowed Values:**
- `LOW`: Low priority issues
- `MEDIUM`: Default priority (most common)
- `HIGH`: High priority issues requiring attention
- `URGENT`: Critical issues requiring immediate attention

**Default:** `MEDIUM`

**Validation:** Backend validates using `@IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])` in DTO

### 4. Statuses

**Allowed Values:**
- `OPEN`: New ticket, not yet assigned
- `IN_PROGRESS`: Ticket assigned and being worked on
- `RESOLVED`: Issue resolved, awaiting confirmation
- `CLOSED`: Ticket closed and archived

**Default:** `OPEN`

**Status Transitions:**
- `OPEN` → `IN_PROGRESS`: When ticket is assigned OR when staff responds
- `IN_PROGRESS` → `RESOLVED`: Admin manually changes status
- `RESOLVED` → `CLOSED`: Admin manually closes ticket
- Any status → `OPEN`: Admin can reopen closed tickets

**Auto-Transitions:**
- When staff responds to an `OPEN` ticket → automatically changes to `IN_PROGRESS`
- When ticket is assigned and status is `OPEN` → automatically changes to `IN_PROGRESS`

### 5. Categories

**Allowed Values:**
- `GENERAL`: General inquiries
- `TECHNICAL`: Technical support issues
- `BILLING`: Billing and payment questions
- `FEATURE_REQUEST`: Feature requests and suggestions

**Default:** `GENERAL`

**Validation:** Backend validates using `@IsIn(['GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE_REQUEST'])` in DTO

### 6. Attachments

**Current Status:** ❌ **Not Implemented**

The current implementation does not support file attachments. This is a potential future enhancement.

**To Add Attachments:**
- Would require adding `attachmentAssetId` field to `SupportTicket` and/or `TicketResponse` models
- Would need to integrate with the existing Asset management system
- Would require file upload handling in both frontend and backend

### 7. Agents & Customers

**Agents (Admins):**
- Users with role `ADMIN` or `SUPER_ADMIN`
- Can view all tickets via `/support/admin/tickets`
- Can assign tickets to themselves or other admins
- Can change ticket status
- Can respond to any ticket (responses marked with `isStaff: true`)
- Have access to statistics dashboard

**Customers:**
- All other user roles (FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, EDUCATOR, PARENT)
- Can create tickets via `/support/tickets` (POST)
- Can view their own tickets via `/support/tickets` (GET)
- Can view individual ticket details via `/support/tickets/:id` (GET)
- Can respond to their own tickets via `/support/tickets/:id/respond` (POST)
- Cannot see tickets created by other users
- Cannot change ticket status or assign tickets

**Authorization Logic:**
- Backend checks `req.context.role` to determine if user is admin
- Backend checks `req.context.profileUserId` (User table ID) for ownership
- Customers can only access tickets where `ticket.userId === req.context.profileUserId`
- Admins can access any ticket

---

## Services, Hooks, API Layers, Controllers, and Utilities

### Backend Services

**SupportService** (`api/src/support/support.service.ts`):
- `createTicket()`: Creates new ticket
- `getUserTickets()`: Gets all tickets for a specific user
- `getAllTickets()`: Gets all tickets (admin only, with filters)
- `getTicketById()`: Gets single ticket with authorization check
- `addResponse()`: Adds response to ticket, handles auto-status updates
- `updateTicketStatus()`: Updates ticket status (admin only, validates status)
- `assignTicket()`: Assigns ticket to admin (admin only)
- `getTicketStats()`: Gets aggregated statistics
- `transformTicket()`: Transforms database model to API response format

### Backend Controllers

**SupportController** (`api/src/support/support.controller.ts`):
- User endpoints (require authentication):
  - `POST /support/tickets` - Create ticket
  - `GET /support/tickets` - Get user's tickets
  - `GET /support/tickets/:id` - Get single ticket
  - `POST /support/tickets/:id/respond` - Add response
- Admin endpoints (require ADMIN or SUPER_ADMIN role):
  - `GET /support/admin/tickets` - Get all tickets (with filters)
  - `PATCH /support/admin/tickets/:id/status` - Update status
  - `PATCH /support/admin/tickets/:id/assign` - Assign ticket
  - `GET /support/admin/stats` - Get statistics

### Frontend Services

**supportService.ts** (`frontend/services/supportService.ts`):
- `supportApi.getTicketsEndpoint()`: Returns endpoint for getting tickets
- `supportApi.getTicketEndpoint(ticketId)`: Returns endpoint for single ticket
- `supportApi.createTicketConfig(data)`: Returns config for creating ticket
- `supportApi.respondToTicketConfig(ticketId, data)`: Returns config for responding
- `supportApi.getAdminTicketsEndpoint(filters)`: Returns admin tickets endpoint with query params
- `supportApi.updateTicketStatusConfig(ticketId, status)`: Returns config for status update
- `supportApi.assignTicketConfig(ticketId, assigneeId)`: Returns config for assignment
- `supportApi.getAdminStatsEndpoint()`: Returns stats endpoint
- `getTicketStatusClass(status)`: Returns CSS classes for status badge
- `getTicketPriorityClass(priority)`: Returns CSS classes for priority badge
- Constants: `TICKET_CATEGORY_LABELS`, `TICKET_PRIORITY_LABELS`, `TICKET_STATUS_LABELS`

### Admin Services

**api.ts** (`admin/src/services/api.ts`, lines 713-742):
- `apiService.getSupportTickets(apiClient, filters)`: Get all tickets with filters
- `apiService.getSupportTicket(apiClient, ticketId)`: Get single ticket
- `apiService.updateTicketStatus(apiClient, ticketId, status)`: Update status
- `apiService.assignTicket(apiClient, ticketId, assigneeId)`: Assign ticket
- `apiService.respondToTicket(apiClient, ticketId, message)`: Respond to ticket
- `apiService.getSupportTicketStats(apiClient)`: Get statistics

### Frontend Hooks

**useAuthenticatedApi** (`frontend/hooks/useAuthenticatedApi.ts`):
- Provides `request()` function for authenticated API calls
- Handles token management and error handling
- Used by `FoundationSupportPage.tsx` for all API requests

### Frontend Components

**FoundationSupportPage.tsx** (`frontend/pages/foundation/FoundationSupportPage.tsx`):
- Main user-facing ticket management page
- Features:
  - FAQ section
  - Ticket list view
  - Ticket detail view (modal/card)
  - New ticket form
  - Response form
  - Status and priority badges
  - Loading and error states

**Support.tsx** (`admin/src/pages/Support.tsx`):
- Admin ticket management dashboard
- Features:
  - Statistics cards (open, in progress, resolved, total)
  - Filtering (status, priority, category, search)
  - Ticket table with sorting
  - Ticket detail panel
  - Status change dropdown
  - Assign to me button
  - Reply form
  - Real-time updates using React Query

### Validation Rules

**Backend DTOs** (`api/src/support/dto/support.dto.ts`):
- `CreateTicketDto`:
  - `subject`: String, 5-200 characters
  - `message`: String, 10-5000 characters
  - `category`: Optional, must be in ['GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE_REQUEST']
  - `priority`: Optional, must be in ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
- `CreateTicketResponseDto`:
  - `message`: String, 1-5000 characters
- `UpdateTicketStatusDto`:
  - `status`: String, must be in ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

**Backend Service Validation:**
- `updateTicketStatus()` validates status against `ALLOWED_STATUSES` constant
- `addResponse()` checks authorization (user can only respond to own tickets unless admin)
- `getTicketById()` checks authorization (user can only view own tickets unless admin)

---

## Next Steps

Continue to **Part 2: Technical Specifications** for detailed frontend and backend implementation details.



# SUPPORT_TICKET_SYSTEM_PART2_TECHNICAL_SPECS.md

# Support Ticket System Documentation - Part 2: Technical Specifications

## Table of Contents
1. [Frontend Technical Specifications](#frontend-technical-specifications)
2. [Backend Technical Specifications](#backend-technical-specifications)

---

## Frontend Technical Specifications

### Pages

#### 1. FoundationSupportPage (`frontend/pages/foundation/FoundationSupportPage.tsx`)

**Purpose:** User-facing ticket management interface for Foundation users (and can be adapted for other roles).

**Features:**
- FAQ section with collapsible items
- Ticket list view with status badges
- Ticket detail view (expanded card)
- New ticket creation form
- Response/reply functionality
- Loading and error states

**State Management:**
```typescript
const [tickets, setTickets] = useState<SupportTicket[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [showNewTicketForm, setShowNewTicketForm] = useState(false);
const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
const [submitting, setSubmitting] = useState(false);
const [newResponse, setNewResponse] = useState('');
const [ticketSubject, setTicketSubject] = useState('');
const [ticketMessage, setTicketMessage] = useState('');
const [ticketCategory, setTicketCategory] = useState<TicketCategory>('GENERAL');
const [ticketPriority, setTicketPriority] = useState<TicketPriority>('MEDIUM');
```

**Key Functions:**
- `fetchTickets()`: Fetches user's tickets using `supportApi.getTicketsEndpoint()`
- `handleTicketSubmit()`: Creates new ticket using `supportApi.createTicketConfig()`
- `handleResponseSubmit()`: Adds response using `supportApi.respondToTicketConfig()`

**API Integration:**
- Uses `useAuthenticatedApi()` hook for authenticated requests
- All requests wrapped in try-catch with error handling
- Automatic ticket list refresh after create/respond operations

#### 2. Admin Support Page (`admin/src/pages/Support.tsx`)

**Purpose:** Admin dashboard for managing all support tickets.

**Features:**
- Statistics dashboard (open, in progress, resolved, total)
- Advanced filtering (status, priority, category, search)
- Ticket table with sortable columns
- Ticket detail panel with quick actions
- Reply functionality
- Real-time updates using React Query

**State Management:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>('');
const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>('');
const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
const [replyMessage, setReplyMessage] = useState('');
```

**React Query Integration:**
- `useQuery` for fetching tickets (with filter dependencies)
- `useQuery` for fetching statistics
- `useQuery` for fetching current user
- `useMutation` for status updates
- `useMutation` for ticket assignment
- `useMutation` for replies
- Automatic cache invalidation on mutations

**Key Functions:**
- `handleStatusChange()`: Updates ticket status via mutation
- `handleAssignToMe()`: Assigns ticket to current admin
- `handleReply()`: Sends reply via mutation

### Components

#### Ticket Table (FoundationSupportPage)

**Location:** `frontend/pages/foundation/FoundationSupportPage.tsx` (lines 389-420)

**Features:**
- Displays ticket subject, status, priority, creation date
- Shows response count
- Clickable rows to view ticket details
- Empty state when no tickets
- Loading spinner during fetch

**Rendering:**
```typescript
{tickets.map(ticket => (
  <div 
    key={ticket.id} 
    className="py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
    onClick={() => setSelectedTicket(ticket)}
  >
    <div>
      <h4 className="text-sm font-medium">{ticket.subject}</h4>
      <div className="flex items-center gap-2 mt-1">
        <span className={getTicketStatusClass(ticket.status)}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
        {ticket.responses.length > 0 && (
          <span>{ticket.responses.length} responses</span>
        )}
      </div>
    </div>
  </div>
))}
```

#### Filters (Admin Support Page)

**Location:** `admin/src/pages/Support.tsx` (lines 237-288)

**Filter Types:**
1. **Search Query**: Text input for searching subject/message
2. **Status Filter**: Dropdown (OPEN, IN_PROGRESS, RESOLVED, CLOSED, All)
3. **Priority Filter**: Dropdown (LOW, MEDIUM, HIGH, URGENT, All)
4. **Category Filter**: Dropdown (GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST, All)

**Implementation:**
- Filters stored in component state
- React Query key includes all filter values for automatic refetch
- Query params built in `apiService.getSupportTickets()`

#### Forms

**New Ticket Form** (`FoundationSupportPage.tsx`, lines 294-369):
- Category dropdown (uses `TICKET_CATEGORY_LABELS`)
- Priority dropdown (uses `TICKET_PRIORITY_LABELS`)
- Subject input (required, 5-200 chars)
- Message textarea (required, 10-5000 chars)
- Submit button with loading state
- Cancel button to close form

**Response Form** (`FoundationSupportPage.tsx`, lines 224-239):
- Textarea for message (required, 1-5000 chars)
- Submit button with loading state
- Only shown if ticket status !== 'CLOSED'

**Reply Form** (`admin/src/pages/Support.tsx`, lines 520-537):
- Textarea for message
- Send button with loading state
- Disabled if message is empty or mutation is pending

#### Message Thread

**Location:** `frontend/pages/foundation/FoundationSupportPage.tsx` (lines 203-221)

**Features:**
- Displays original ticket message
- Shows all responses in chronological order
- Visual distinction between staff and customer responses
- Staff responses: `bg-swiss-teal/10 ml-4`
- Customer responses: `bg-gray-50 mr-4`
- Shows user name and timestamp for each response

**Rendering:**
```typescript
{selectedTicket.responses.map(response => (
  <div 
    key={response.id} 
    className={`p-4 rounded-lg ${
      response.isStaff ? 'bg-swiss-teal/10 ml-4' : 'bg-gray-50 mr-4'
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <span className={response.isStaff ? 'text-swiss-teal' : 'text-gray-600'}>
        {response.isStaff ? 'Staff' : response.userName || 'You'}
      </span>
      <span>{new Date(response.createdAt).toLocaleString()}</span>
    </div>
    <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
  </div>
))}
```

#### Status Badges

**Location:** `frontend/services/supportService.ts` (lines 130-143)

**Function:** `getTicketStatusClass(status: string): string`

**Mappings:**
- `OPEN`: `'bg-yellow-100 text-yellow-800'`
- `IN_PROGRESS`: `'bg-blue-100 text-blue-800'`
- `RESOLVED`: `'bg-green-100 text-green-800'`
- `CLOSED`: `'bg-gray-100 text-gray-800'`
- Default: `'bg-gray-100 text-gray-800'`

**Usage:**
```typescript
<span className={`px-2 py-1 text-xs font-medium rounded-full ${getTicketStatusClass(ticket.status)}`}>
  {TICKET_STATUS_LABELS[ticket.status]}
</span>
```

#### Priority Badges

**Location:** `frontend/services/supportService.ts` (lines 148-161)

**Function:** `getTicketPriorityClass(priority: string): string`

**Mappings:**
- `LOW`: `'bg-gray-100 text-gray-800'`
- `MEDIUM`: `'bg-yellow-100 text-yellow-800'`
- `HIGH`: `'bg-orange-100 text-orange-800'`
- `URGENT`: `'bg-red-100 text-red-800'`
- Default: `'bg-gray-100 text-gray-800'`

### State Management Patterns

#### FoundationSupportPage

**Pattern:** Local component state with `useState`

**Data Flow:**
1. Component mounts → `useEffect` calls `fetchTickets()`
2. `fetchTickets()` uses `useAuthenticatedApi().request()` to fetch data
3. Response data stored in `tickets` state
4. User interactions (create, respond) trigger API calls
5. After successful API calls, `fetchTickets()` is called again to refresh list

**No Global State:** Each page manages its own ticket state independently.

#### Admin Support Page

**Pattern:** React Query for server state management

**Data Flow:**
1. React Query manages caching and automatic refetching
2. Filter changes trigger automatic refetch (via query key dependencies)
3. Mutations invalidate queries to trigger refetch
4. Optimistic updates possible but not currently implemented

**Query Keys:**
- `['support-tickets', status, priority, category, searchQuery]` - Tickets list
- `['support-stats']` - Statistics
- `['current-user']` - Current admin user

### API Service Layer Structure

#### Frontend Service (`frontend/services/supportService.ts`)

**Pattern:** Configuration-based API functions

**Structure:**
```typescript
export const supportApi = {
  // Returns endpoint string
  getTicketsEndpoint: () => '/support/tickets',
  
  // Returns config object for request
  createTicketConfig: (data: CreateTicketData) => ({
    endpoint: '/support/tickets',
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),
  
  // Admin endpoints with query params
  getAdminTicketsEndpoint: (filters?: {...}) => {
    const params = new URLSearchParams();
    // Build query string
    return `/support/admin/tickets?${params.toString()}`;
  },
};
```

**Why This Pattern:**
- Separates endpoint configuration from request execution
- Allows `useAuthenticatedApi().request()` to handle auth and errors
- Makes it easy to test and mock
- Consistent with other API services in the codebase

**Usage:**
```typescript
const config = supportApi.createTicketConfig({ subject, message, category, priority });
const res = await request(config.endpoint, {
  method: config.method,
  body: config.body,
});
```

#### Admin Service (`admin/src/services/api.ts`)

**Pattern:** Direct axios calls with apiClient

**Structure:**
```typescript
export const apiService = {
  getSupportTickets: (apiClient: AxiosInstance, filters?: {...}) => {
    const params = new URLSearchParams();
    // Build query string
    return apiClient.get<ApiResponse<any[]>>(
      `/support/admin/tickets${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  
  updateTicketStatus: (apiClient: AxiosInstance, ticketId: string, status: string) =>
    apiClient.patch<ApiResponse<any>>(
      `/support/admin/tickets/${ticketId}/status`, 
      { status }
    ),
};
```

**Why This Pattern:**
- Direct integration with React Query
- Type-safe with TypeScript
- Automatic error handling via axios interceptors
- Consistent with other admin API services

**Usage:**
```typescript
const { data } = useQuery({
  queryKey: ['support-tickets', filters],
  queryFn: () => apiService.getSupportTickets(apiClient, filters),
});
```

### Pagination, Sorting, and Filtering

#### Pagination

**Current Status:** ❌ **Not Implemented**

All tickets are fetched in a single request. For large datasets, pagination should be added.

**To Add Pagination:**
1. Backend: Add `page` and `limit` query params to `getAllTickets()`
2. Backend: Use Prisma `skip` and `take` for pagination
3. Backend: Return `{ tickets, total, page, limit, totalPages }`
4. Frontend: Add pagination controls (page numbers, prev/next buttons)
5. Frontend: Update API calls to include page/limit params

#### Sorting

**Current Status:** ⚠️ **Limited Implementation**

- Backend: Tickets sorted by `createdAt DESC` (newest first) - hardcoded
- Frontend: No user-controlled sorting

**To Add Sorting:**
1. Backend: Add `sortBy` and `sortOrder` query params
2. Backend: Use Prisma `orderBy` with dynamic field
3. Frontend: Add sort dropdown (by date, status, priority, etc.)
4. Frontend: Update API calls to include sort params

#### Filtering

**Current Status:** ✅ **Fully Implemented**

**Backend Filtering** (`support.service.ts`, lines 84-106):
```typescript
async getAllTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
}): Promise<SupportTicketResponse[]> {
  const where: any = {};
  
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.priority) {
    where.priority = filters.priority;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  const tickets = await this.prisma.supportTicket.findMany({ where, ... });
}
```

**Frontend Filtering** (`admin/src/pages/Support.tsx`):
- Filters stored in component state
- React Query key includes filter values
- Query automatically refetches when filters change

**Search Implementation:**
- Case-insensitive search on `subject` and `message` fields
- Uses Prisma `contains` with `mode: 'insensitive'`

### Attachments Handling

**Current Status:** ❌ **Not Implemented**

No file attachment functionality exists. To add:

1. **Database Schema:**
   - Add `attachmentAssetId` field to `SupportTicket` and/or `TicketResponse` models
   - Reference existing `Asset` model

2. **Backend:**
   - Add file upload endpoint or use existing asset upload system
   - Update DTOs to accept file data
   - Store asset ID in ticket/response

3. **Frontend:**
   - Add file input to ticket creation form
   - Add file input to response form
   - Display attachments in ticket detail view
   - Use existing asset upload service if available

### Error Handling and Validation

#### Frontend Error Handling

**FoundationSupportPage:**
```typescript
try {
  const res = await request(config.endpoint, { method: config.method, body: config.body });
  if (res.success) {
    // Success handling
  } else {
    setError(t('common:errors.submitFailed'));
  }
} catch (err) {
  console.error('Error submitting ticket:', err);
  setError(t('common:errors.submitFailed'));
} finally {
  setSubmitting(false);
}
```

**Error States:**
- `error` state stores error message
- Error displayed to user with retry option
- Loading state prevents duplicate submissions

#### Admin Support Page

**React Query Error Handling:**
- React Query automatically handles errors
- Errors can be accessed via `error` property from `useQuery`/`useMutation`
- Error boundaries can catch unhandled errors

#### Validation

**Frontend Validation:**
- HTML5 `required` attributes on form inputs
- Character limits enforced by input `maxLength` attributes
- TypeScript types ensure correct data shapes

**Backend Validation:**
- DTO validation using `class-validator` decorators
- Service-level validation for business rules
- Authorization checks before operations

---

## Backend Technical Specifications

### Database Schema/Models

#### SupportTicket Model

**File:** `api/prisma/schema.prisma` (lines 1844-1867)

**Fields:**
```prisma
model SupportTicket {
  id          String    @id @default(uuid())
  userId      String
  subject     String
  message     String    @db.Text
  category    String    @default("GENERAL")
  priority    String    @default("MEDIUM")
  status      String    @default("OPEN")
  assignedTo  String?
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  user        User             @relation("UserSupportTickets", fields: [userId], references: [id])
  assignee    User?            @relation("AssignedSupportTickets", fields: [assignedTo], references: [id])
  responses   TicketResponse[]

  @@index([userId])
  @@index([status])
  @@index([priority])
  @@index([assignedTo])
  @@map("support_tickets")
}
```

**Indexes:**
- `userId`: For fast lookup of user's tickets
- `status`: For filtering by status
- `priority`: For filtering by priority
- `assignedTo`: For finding tickets assigned to specific admin

#### TicketResponse Model

**File:** `api/prisma/schema.prisma` (lines 1869-1883)

**Fields:**
```prisma
model TicketResponse {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  message   String   @db.Text
  isStaff   Boolean  @default(false)
  createdAt DateTime @default(now())

  // Relations
  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User          @relation("UserTicketResponses", fields: [userId], references: [id])

  @@index([ticketId])
  @@map("ticket_responses")
}
```

**Cascade Delete:** When a ticket is deleted, all its responses are automatically deleted.

### Relations Between Tickets, Messages, and Users

**User → SupportTicket (One-to-Many):**
- One user can create many tickets
- Relation: `User.supportTickets` → `SupportTicket[]`
- Foreign key: `SupportTicket.userId` → `User.id`

**User → SupportTicket (One-to-Many, Optional):**
- One admin can be assigned to many tickets
- Relation: `User.assignedTickets` → `SupportTicket[]`
- Foreign key: `SupportTicket.assignedTo` → `User.id` (nullable)

**SupportTicket → TicketResponse (One-to-Many):**
- One ticket can have many responses
- Relation: `SupportTicket.responses` → `TicketResponse[]`
- Foreign key: `TicketResponse.ticketId` → `SupportTicket.id`
- Cascade delete: Deleting ticket deletes all responses

**User → TicketResponse (One-to-Many):**
- One user can create many responses
- Relation: `User.ticketResponses` → `TicketResponse[]`
- Foreign key: `TicketResponse.userId` → `User.id`

**Entity Relationship Diagram:**
```
User
├── supportTickets (SupportTicket[]) - tickets created by user
├── assignedTickets (SupportTicket[]) - tickets assigned to user (if admin)
└── ticketResponses (TicketResponse[]) - responses created by user

SupportTicket
├── user (User) - creator of ticket
├── assignee (User?) - assigned admin (nullable)
└── responses (TicketResponse[]) - all responses to ticket

TicketResponse
├── ticket (SupportTicket) - parent ticket
└── user (User) - creator of response
```

### Controllers & Routes

**File:** `api/src/support/support.controller.ts`

#### User Routes (Authenticated)

**POST /support/tickets**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`
- **Body:** `CreateTicketDto`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse>`
- **Handler:** `createTicket()`
- **Logic:** Creates ticket with user ID from auth context

**GET /support/tickets**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse[]>`
- **Handler:** `getMyTickets()`
- **Logic:** Returns all tickets for current user

**GET /support/tickets/:id**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`
- **Params:** `id` (ticket ID)
- **Response:** `ApiResponseEnvelope<SupportTicketResponse>`
- **Handler:** `getTicket()`
- **Logic:** Returns ticket if user owns it or is admin

**POST /support/tickets/:id/respond**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`
- **Params:** `id` (ticket ID)
- **Body:** `CreateTicketResponseDto`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse>`
- **Handler:** `respondToTicket()`
- **Logic:** Adds response, auto-updates status if staff responds to OPEN ticket

#### Admin Routes (Require ADMIN or SUPER_ADMIN Role)

**GET /support/admin/tickets**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`, `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`
- **Query Params:** `status?`, `priority?`, `category?`, `search?`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse[]>`
- **Handler:** `getAllTickets()`
- **Logic:** Returns all tickets with optional filters

**PATCH /support/admin/tickets/:id/status**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`, `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`
- **Params:** `id` (ticket ID)
- **Body:** `UpdateTicketStatusDto`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse>`
- **Handler:** `updateTicketStatus()`
- **Logic:** Updates status, sets `resolvedAt` if RESOLVED/CLOSED

**PATCH /support/admin/tickets/:id/assign**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`, `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`
- **Params:** `id` (ticket ID)
- **Body:** `{ assigneeId?: string }`
- **Response:** `ApiResponseEnvelope<SupportTicketResponse>`
- **Handler:** `assignTicket()`
- **Logic:** Assigns ticket to admin (or current admin if no assigneeId), auto-updates status

**GET /support/admin/stats**
- **Guard:** `ClerkAuthGuard`, `RolesGuard`, `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`
- **Response:** `ApiResponseEnvelope<TicketStats>`
- **Handler:** `getTicketStats()`
- **Logic:** Returns aggregated statistics

### Services and Business Logic

**File:** `api/src/support/support.service.ts`

#### createTicket()

**Purpose:** Create a new support ticket

**Parameters:**
- `userId: string` - User ID from auth context
- `data: { subject, message, category?, priority? }` - Ticket data

**Logic:**
1. Create ticket with defaults: `category = 'GENERAL'`, `priority = 'MEDIUM'`, `status = 'OPEN'`
2. Include relations: `user`, `assignee`, `responses` (with nested `user`)
3. Transform and return ticket

**Returns:** `SupportTicketResponse`

#### getUserTickets()

**Purpose:** Get all tickets for a specific user

**Parameters:**
- `userId: string` - User ID

**Logic:**
1. Find all tickets where `userId` matches
2. Include relations: `user`, `assignee`, `responses` (ordered by `createdAt ASC`)
3. Order tickets by `createdAt DESC` (newest first)
4. Transform and return array

**Returns:** `SupportTicketResponse[]`

#### getAllTickets()

**Purpose:** Get all tickets with optional filters (admin only)

**Parameters:**
- `filters?: { status?, priority?, category?, search? }` - Optional filters

**Logic:**
1. Build Prisma `where` clause from filters
2. If `search` provided, use `OR` condition on `subject` and `message` (case-insensitive)
3. Include relations: `user`, `assignee`, `responses` (ordered by `createdAt ASC`)
4. Order tickets by `createdAt DESC`
5. Transform and return array

**Returns:** `SupportTicketResponse[]`

#### getTicketById()

**Purpose:** Get a single ticket with authorization check

**Parameters:**
- `ticketId: string` - Ticket ID
- `userId: string` - User ID from auth context
- `isAdmin: boolean` - Whether user is admin

**Logic:**
1. Find ticket by ID with relations
2. If ticket not found, throw `NotFoundException`
3. If not admin and ticket doesn't belong to user, throw `ForbiddenException`
4. Transform and return ticket

**Returns:** `SupportTicketResponse`

**Throws:**
- `NotFoundException` if ticket doesn't exist
- `ForbiddenException` if user doesn't have access

#### addResponse()

**Purpose:** Add a response to a ticket

**Parameters:**
- `ticketId: string` - Ticket ID
- `userId: string` - User ID from auth context
- `message: string` - Response message
- `isStaff: boolean` - Whether user is admin/staff

**Logic:**
1. Find ticket by ID
2. If ticket not found, throw `NotFoundException`
3. If not staff and ticket doesn't belong to user, throw `ForbiddenException`
4. Create response with `isStaff` flag
5. If staff responds to OPEN ticket, auto-update status to `IN_PROGRESS`
6. Return updated ticket via `getTicketById()`

**Returns:** `SupportTicketResponse`

**Auto-Status Update:**
- If `isStaff === true` AND `ticket.status === 'OPEN'` → Update to `'IN_PROGRESS'`

#### updateTicketStatus()

**Purpose:** Update ticket status (admin only)

**Parameters:**
- `ticketId: string` - Ticket ID
- `status: string` - New status
- `adminUserId: string` - Admin user ID

**Logic:**
1. Validate status against `ALLOWED_STATUSES` constant
2. If invalid, throw `BadRequestException`
3. Find ticket by ID
4. If ticket not found, throw `NotFoundException`
5. Build update data: `{ status }`
6. If status is `RESOLVED` or `CLOSED`, set `resolvedAt` to current timestamp
7. Update ticket
8. Return updated ticket via `getTicketById()`

**Returns:** `SupportTicketResponse`

**Allowed Statuses:** `['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']`

#### assignTicket()

**Purpose:** Assign ticket to admin (admin only)

**Parameters:**
- `ticketId: string` - Ticket ID
- `assigneeId: string` - Admin user ID to assign to

**Logic:**
1. Find ticket by ID
2. If ticket not found, throw `NotFoundException`
3. Update ticket: Set `assignedTo` to `assigneeId`
4. If ticket status is `OPEN`, auto-update to `IN_PROGRESS`
5. Return updated ticket via `getTicketById()`

**Returns:** `SupportTicketResponse`

**Auto-Status Update:**
- If `ticket.status === 'OPEN'` → Update to `'IN_PROGRESS'`

#### getTicketStats()

**Purpose:** Get aggregated ticket statistics

**Parameters:** None

**Logic:**
1. Count total tickets
2. Group by status and count
3. Group by priority and count
4. Group by category and count
5. Build response object with counts and grouped data

**Returns:**
```typescript
{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}
```

#### transformTicket()

**Purpose:** Transform Prisma model to API response format

**Parameters:**
- `ticket: any` - Prisma ticket object with relations

**Logic:**
1. Extract ticket fields
2. Format dates to ISO strings
3. Transform user relation (if exists)
4. Transform assignee relation (if exists)
5. Transform responses array with user names
6. Return formatted object

**Returns:** `SupportTicketResponse`

### Validation Rules

#### DTO Validation (`api/src/support/dto/support.dto.ts`)

**CreateTicketDto:**
```typescript
{
  subject: string;      // @IsString(), @MinLength(5), @MaxLength(200)
  message: string;      // @IsString(), @MinLength(10), @MaxLength(5000)
  category?: string;    // @IsString(), @IsOptional(), @IsIn([...])
  priority?: string;    // @IsString(), @IsOptional(), @IsIn([...])
}
```

**CreateTicketResponseDto:**
```typescript
{
  message: string;      // @IsString(), @MinLength(1), @MaxLength(5000)
}
```

**UpdateTicketStatusDto:**
```typescript
{
  status: string;       // @IsString(), @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
}
```

**Validation Errors:**
- Returned as HTTP 400 Bad Request
- NestJS automatically validates DTOs using `class-validator`
- Error messages include field names and validation rules

### Authentication & Authorization Requirements

#### Authentication

**All Endpoints:**
- Require `ClerkAuthGuard` - Validates Clerk JWT token
- Token extracted from `Authorization: Bearer <token>` header
- User ID extracted from token and stored in `req.context.profileUserId`

#### Authorization

**User Endpoints:**
- Any authenticated user can access
- User can only access their own tickets
- Authorization checked in `getTicketById()` and `addResponse()`

**Admin Endpoints:**
- Require `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)` decorator
- Role checked by `RolesGuard`
- Role extracted from `req.context.role`

**Authorization Checks:**
1. **getTicketById()**: Checks if user owns ticket OR is admin
2. **addResponse()**: Checks if user owns ticket OR is admin
3. **Admin endpoints**: Role checked at controller level

### How Assignments Work

**Flow:**
1. Admin clicks "Assign to Me" or selects assignee
2. Frontend calls `PATCH /support/admin/tickets/:id/assign`
3. Backend `assignTicket()` updates `assignedTo` field
4. If ticket was `OPEN`, status auto-changes to `IN_PROGRESS`
5. Response includes updated ticket with assignee info
6. Frontend refreshes ticket list/detail

**Assignment Rules:**
- Only admins can assign tickets
- Can assign to any admin (or self if no `assigneeId` provided)
- Assignment automatically triggers status change if ticket is OPEN

### How Status Changes Work

**Flow:**
1. Admin changes status dropdown
2. Frontend calls `PATCH /support/admin/tickets/:id/status`
3. Backend validates status against `ALLOWED_STATUSES`
4. If status is `RESOLVED` or `CLOSED`, `resolvedAt` is set
5. Ticket updated in database
6. Response includes updated ticket
7. Frontend refreshes ticket list/detail

**Status Transition Rules:**
- Any status can be changed to any other status (no restrictions)
- `resolvedAt` timestamp is set when status becomes `RESOLVED` or `CLOSED`
- `resolvedAt` is NOT cleared when reopening (historical record)

### How Message Sending Works

**Flow:**
1. User/Admin types message and submits
2. Frontend calls `POST /support/tickets/:id/respond`
3. Backend checks authorization (user can only respond to own tickets unless admin)
4. Response created with `isStaff` flag based on user role
5. If staff responds to `OPEN` ticket, status auto-changes to `IN_PROGRESS`
6. Response added to ticket's responses array
7. Full ticket with updated responses returned
8. Frontend refreshes ticket detail view

**Response Rules:**
- Customers can only respond to their own tickets
- Admins can respond to any ticket
- Staff responses marked with `isStaff: true`
- Customer responses marked with `isStaff: false`
- Staff response to OPEN ticket triggers status change

---

## Next Steps

Continue to **Part 3: Implementation Guide** for step-by-step instructions on extending the system.



# SUPPORT_TICKET_SYSTEM_PART3_IMPLEMENTATION_GUIDE.md

# Support Ticket System Documentation - Part 3: Implementation Guide

## Table of Contents
1. [Adding New Fields to Tickets](#adding-new-fields-to-tickets)
2. [Adding New Statuses or Priorities](#adding-new-statuses-or-priorities)
3. [Adding New Actions](#adding-new-actions)
4. [Adding New Message Types](#adding-new-message-types)

---

## Adding New Fields to Tickets

This guide walks through adding a new field (e.g., `tags` or `estimatedResolutionDate`) to the Support Ticket System.

### Step 1: Update Database Schema

**File:** `api/prisma/schema.prisma`

**Location:** `SupportTicket` model (around line 1844)

**Example: Adding a `tags` field (array of strings):**

```prisma
model SupportTicket {
  id          String    @id @default(uuid())
  userId      String
  subject     String
  message     String    @db.Text
  category    String    @default("GENERAL")
  priority    String    @default("MEDIUM")
  status      String    @default("OPEN")
  assignedTo  String?
  resolvedAt  DateTime?
  tags        String[]  @default([])  // NEW FIELD
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // ... rest of model
}
```

**Example: Adding a `estimatedResolutionDate` field (DateTime, nullable):**

```prisma
model SupportTicket {
  // ... existing fields
  estimatedResolutionDate  DateTime?  // NEW FIELD
  createdAt   DateTime  @default(now())
  // ... rest of model
}
```

**After updating schema:**
1. Create migration: `npx prisma migrate dev --name add_tags_to_support_tickets`
2. Generate Prisma client: `npx prisma generate`

### Step 2: Update Backend DTOs

**File:** `api/src/support/dto/support.dto.ts`

**Update `CreateTicketDto` to include new field:**

```typescript
import { IsString, IsOptional, IsIn, MinLength, MaxLength, IsArray, IsDateString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsString()
  @IsOptional()
  @IsIn(['GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE_REQUEST'])
  category?: 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';

  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  // NEW FIELD - Example for tags
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  // OR for estimatedResolutionDate:
  // @IsDateString()
  // @IsOptional()
  // estimatedResolutionDate?: string;
}
```

**Update `SupportTicketResponse` interface:**

```typescript
export interface SupportTicketResponse {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedTo?: string | null;
  tags?: string[];  // NEW FIELD
  // OR: estimatedResolutionDate?: string | null;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  responses: {
    id: string;
    message: string;
    isStaff: boolean;
    createdAt: string;
    userName?: string;
  }[];
}
```

### Step 3: Update Backend Service

**File:** `api/src/support/support.service.ts`

**Update `createTicket()` method:**

```typescript
async createTicket(
  userId: string,
  data: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    tags?: string[];  // NEW FIELD
  },
): Promise<SupportTicketResponse> {
  const ticket = await this.prisma.supportTicket.create({
    data: {
      userId,
      subject: data.subject,
      message: data.message,
      category: data.category || 'GENERAL',
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      tags: data.tags || [],  // NEW FIELD - with default
    },
    include: {
      // ... existing includes
    },
  });

  return this.transformTicket(ticket);
}
```

**Update `transformTicket()` method:**

```typescript
private transformTicket(ticket: any): SupportTicketResponse {
  return {
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    assignedTo: ticket.assignedTo || null,
    tags: ticket.tags || [],  // NEW FIELD
    assignee: ticket.assignee
      ? {
          id: ticket.assignee.id,
          firstName: ticket.assignee.firstName,
          lastName: ticket.assignee.lastName,
          email: ticket.assignee.email,
        }
      : null,
    user: ticket.user
      ? {
          id: ticket.user.id,
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
          email: ticket.user.email,
        }
      : undefined,
    responses: (ticket.responses || []).map((r: any) => ({
      id: r.id,
      message: r.message,
      isStaff: r.isStaff,
      createdAt: r.createdAt.toISOString(),
      userName: r.user
        ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown',
    })),
  };
}
```

**If adding filtering support, update `getAllTickets()`:**

```typescript
async getAllTickets(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  tags?: string[];  // NEW FILTER
}): Promise<SupportTicketResponse[]> {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.priority) {
    where.priority = filters.priority;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { message: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  // NEW FILTER - Example for tags (array contains)
  if (filters?.tags && filters.tags.length > 0) {
    where.tags = {
      hasSome: filters.tags,  // Prisma array filter
    };
  }

  // ... rest of method
}
```

### Step 4: Update Backend Controller

**File:** `api/src/support/support.controller.ts`

**If adding filter support, update `getAllTickets()` endpoint:**

```typescript
@Get('admin/tickets')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'Get all tickets (admin)' })
@ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
async getAllTickets(
  @Query('status') status?: string,
  @Query('priority') priority?: string,
  @Query('category') category?: string,
  @Query('search') search?: string,
  @Query('tags') tags?: string,  // NEW QUERY PARAM (comma-separated)
) {
  const tagsArray = tags ? tags.split(',') : undefined;
  
  const tickets = await this.supportService.getAllTickets({
    status,
    priority,
    category,
    search,
    tags: tagsArray,  // NEW FILTER
  });
  return wrapResponse(tickets);
}
```

### Step 5: Update Frontend API Service

**File:** `frontend/services/supportService.ts`

**Update `SupportTicket` interface:**

```typescript
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  tags?: string[];  // NEW FIELD
  responses: TicketResponse[];
}
```

**Update `CreateTicketData` interface:**

```typescript
export interface CreateTicketData {
  subject: string;
  message: string;
  category?: 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];  // NEW FIELD
}
```

**If adding filter support, update `getAdminTicketsEndpoint()`:**

```typescript
getAdminTicketsEndpoint: (filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  tags?: string[];  // NEW FILTER
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags && filters.tags.length > 0) {
    params.append('tags', filters.tags.join(','));  // Comma-separated
  }

  const queryString = params.toString();
  return queryString
    ? `${SUPPORT_ENDPOINTS.adminTickets}?${queryString}`
    : SUPPORT_ENDPOINTS.adminTickets;
},
```

### Step 6: Update Frontend UI Components

**File:** `frontend/pages/foundation/FoundationSupportPage.tsx`

**Add state for new field:**

```typescript
const [ticketTags, setTicketTags] = useState<string[]>([]);
```

**Add form input in new ticket form:**

```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Tags (comma-separated)
  </label>
  <input
    type="text"
    value={ticketTags.join(', ')}
    onChange={(e) => {
      const tags = e.target.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      setTicketTags(tags);
    }}
    className={STANDARD_INPUT_FIELD}
    placeholder="tag1, tag2, tag3"
  />
</div>
```

**Update `handleTicketSubmit()`:**

```typescript
const config = supportApi.createTicketConfig({
  subject: ticketSubject,
  message: ticketMessage,
  category: ticketCategory,
  priority: ticketPriority,
  tags: ticketTags,  // NEW FIELD
});
```

**Display tags in ticket detail view:**

```typescript
{selectedTicket.tags && selectedTicket.tags.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {selectedTicket.tags.map((tag, index) => (
      <span
        key={index}
        className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700"
      >
        {tag}
      </span>
    ))}
  </div>
)}
```

### Step 7: Update Admin Dashboard

**File:** `admin/src/types/index.ts`

**Update `SupportTicket` interface:**

```typescript
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedTo?: string | null;
  tags?: string[];  // NEW FIELD
  responses: TicketResponse[];
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}
```

**File:** `admin/src/services/api.ts`

**Update `getSupportTickets()` if adding filter:**

```typescript
getSupportTickets: (apiClient: AxiosInstance, filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  tags?: string[];  // NEW FILTER
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags && filters.tags.length > 0) {
    params.append('tags', filters.tags.join(','));
  }
  
  return apiClient.get<ApiResponse<any[]>>(
    `/support/admin/tickets${params.toString() ? `?${params.toString()}` : ''}`
  );
},
```

**File:** `admin/src/pages/Support.tsx`

**Add filter state and UI:**

```typescript
const [selectedTags, setSelectedTags] = useState<string[]>([]);

// In filters section:
<input
  type="text"
  placeholder="Filter by tags (comma-separated)"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  value={selectedTags.join(', ')}
  onChange={(e) => {
    const tags = e.target.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setSelectedTags(tags);
  }}
/>

// Update query:
const { data: ticketsResponse } = useQuery({
  queryKey: ['support-tickets', selectedStatus, selectedPriority, selectedCategory, searchQuery, selectedTags],
  queryFn: () =>
    apiService.getSupportTickets(apiClient, {
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
      category: selectedCategory || undefined,
      search: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    }),
});
```

### Step 8: Update Validation Logic

**Backend validation is handled by DTO decorators (already done in Step 2).**

**Frontend validation (optional):**

```typescript
// In form submission handler
if (ticketTags.length > 10) {
  setError('Maximum 10 tags allowed');
  return;
}

ticketTags.forEach(tag => {
  if (tag.length > 20) {
    setError('Each tag must be 20 characters or less');
    return;
  }
});
```

### Step 9: Testing Checklist

- [ ] Create ticket with new field via frontend
- [ ] Verify field is saved in database
- [ ] Verify field appears in ticket detail view
- [ ] Verify field appears in admin dashboard
- [ ] Test filtering by new field (if applicable)
- [ ] Test validation rules (if applicable)
- [ ] Test with empty/null values
- [ ] Test API response includes new field
- [ ] Test existing tickets still work (backward compatibility)

---

## Adding New Statuses or Priorities

This guide walks through adding a new status (e.g., `ESCALATED`) or priority (e.g., `CRITICAL`).

### Step 1: Update Backend Constants

**File:** `api/src/support/support.service.ts`

**Update `ALLOWED_STATUSES` constant:**

```typescript
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'] as const;
```

**Note:** If adding a priority, no constant exists - update DTO validation instead.

### Step 2: Update Backend DTOs

**File:** `api/src/support/dto/support.dto.ts`

**For new status, update `UpdateTicketStatusDto`:**

```typescript
export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'])  // ADD NEW STATUS
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
}
```

**For new priority, update `CreateTicketDto`:**

```typescript
export class CreateTicketDto {
  // ... existing fields
  
  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])  // ADD NEW PRIORITY
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
}
```

### Step 3: Update Backend Service Logic

**File:** `api/src/support/support.service.ts`

**If new status affects `resolvedAt` logic, update `updateTicketStatus()`:**

```typescript
async updateTicketStatus(
  ticketId: string,
  status: string,
  adminUserId: string,
): Promise<SupportTicketResponse> {
  // ... validation
  
  const updateData: { status: string; resolvedAt?: Date } = { status };

  // Update logic if ESCALATED should also set resolvedAt
  if (status === 'RESOLVED' || status === 'CLOSED') {
    updateData.resolvedAt = new Date();
  }
  // If ESCALATED should NOT set resolvedAt, no change needed

  // ... rest of method
}
```

### Step 4: Update Frontend Types

**File:** `frontend/services/supportService.ts`

**Update type definitions:**

```typescript
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';  // ADD NEW
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';  // ADD NEW
```

**Update label constants:**

```typescript
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  ESCALATED: 'Escalated',  // ADD NEW
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
  CRITICAL: 'Critical',  // ADD NEW
};
```

### Step 5: Update Badge Styling Functions

**File:** `frontend/services/supportService.ts`

**Update `getTicketStatusClass()`:**

```typescript
export const getTicketStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
    case 'ESCALATED':  // ADD NEW
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
```

**Update `getTicketPriorityClass()`:**

```typescript
export const getTicketPriorityClass = (priority: string): string => {
  switch (priority.toUpperCase()) {
    case 'LOW':
      return 'bg-gray-100 text-gray-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'URGENT':
      return 'bg-red-100 text-red-800';
    case 'CRITICAL':  // ADD NEW
      return 'bg-red-200 text-red-900 border-2 border-red-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
```

### Step 6: Update Frontend UI Components

**File:** `frontend/pages/foundation/FoundationSupportPage.tsx`

**Update priority dropdown (if adding priority):**

```typescript
<select
  value={ticketPriority}
  onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
  className={STANDARD_INPUT_FIELD}
>
  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</select>
```

**Note:** The dropdown will automatically include the new option since it iterates over `TICKET_PRIORITY_LABELS`.

### Step 7: Update Admin Dashboard

**File:** `admin/src/types/index.ts`

**Update type definitions:**

```typescript
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
```

**File:** `admin/src/pages/Support.tsx`

**Update status filter dropdown:**

```typescript
<select
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  value={selectedStatus}
  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus | '')}
>
  <option value="">All Statuses</option>
  <option value="OPEN">Open</option>
  <option value="IN_PROGRESS">In Progress</option>
  <option value="RESOLVED">Resolved</option>
  <option value="CLOSED">Closed</option>
  <option value="ESCALATED">Escalated</option>  {/* ADD NEW */}
</select>
```

**Update status change dropdown in ticket detail:**

```typescript
<select
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  value={selectedTicket.status}
  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
>
  <option value="OPEN">Open</option>
  <option value="IN_PROGRESS">In Progress</option>
  <option value="RESOLVED">Resolved</option>
  <option value="CLOSED">Closed</option>
  <option value="ESCALATED">Escalated</option>  {/* ADD NEW */}
</select>
```

**Update `getStatusColor()` function:**

```typescript
const getStatusColor = (status: TicketStatus): string => {
  switch (status) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'ESCALATED':  // ADD NEW
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
```

### Step 8: Update Statistics (if needed)

**File:** `api/src/support/support.service.ts`

**If new status should be included in stats, update `getTicketStats()`:**

```typescript
async getTicketStats() {
  // ... existing code
  
  return {
    total,
    byStatus: statusCounts,
    byPriority: priorityCounts,
    byCategory: categoryCounts,
    open: statusCounts['OPEN'] || 0,
    inProgress: statusCounts['IN_PROGRESS'] || 0,
    resolved: statusCounts['RESOLVED'] || 0,
    closed: statusCounts['CLOSED'] || 0,
    escalated: statusCounts['ESCALATED'] || 0,  // ADD NEW
  };
}
```

**Update admin dashboard to display new stat (if applicable):**

```typescript
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Escalated</p>
      <p className="text-2xl font-bold text-red-600">{stats.escalated}</p>
    </div>
    <AlertCircle className="h-8 w-8 text-red-500" />
  </div>
</div>
```

### Step 9: Testing Checklist

- [ ] Create ticket with new priority (if applicable)
- [ ] Change ticket to new status via admin dashboard
- [ ] Verify badge styling displays correctly
- [ ] Verify filter dropdown includes new option
- [ ] Verify statistics include new status/priority (if applicable)
- [ ] Test validation rejects invalid status/priority
- [ ] Test existing tickets still work (backward compatibility)

---

## Adding New Actions

This guide walks through adding a new action (e.g., `escalate`, `reopen`, `addInternalNote`).

### Example 1: Adding an "Escalate" Action

#### Step 1: Update Backend Service

**File:** `api/src/support/support.service.ts`

**Add new method:**

```typescript
/**
 * Escalate ticket (admin only)
 */
async escalateTicket(
  ticketId: string,
  adminUserId: string,
  reason?: string,
): Promise<SupportTicketResponse> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
  }

  // Update status to ESCALATED
  await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'ESCALATED',
      // Optionally store escalation reason in a note or separate field
    },
  });

  // Optionally create an internal note
  if (reason) {
    await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        userId: adminUserId,
        message: `[INTERNAL] Escalated: ${reason}`,
        isStaff: true,
      },
    });
  }

  return this.getTicketById(ticketId, adminUserId, true);
}
```

#### Step 2: Update Backend Controller

**File:** `api/src/support/support.controller.ts`

**Add new endpoint:**

```typescript
@Post('admin/tickets/:id/escalate')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'Escalate ticket (admin)' })
@ApiResponse({ status: 200, description: 'Ticket escalated successfully' })
async escalateTicket(
  @Request() req,
  @Param('id') ticketId: string,
  @Body('reason') reason?: string,
) {
  const adminUserId = req.context.profileUserId;
  const ticket = await this.supportService.escalateTicket(ticketId, adminUserId, reason);
  return wrapResponse(ticket, 'Ticket escalated successfully');
}
```

#### Step 3: Update Frontend API Service

**File:** `frontend/services/supportService.ts`

**Add new function:**

```typescript
export const supportApi = {
  // ... existing functions
  
  /**
   * Escalate ticket (admin) - returns config for POST request
   */
  escalateTicketConfig: (ticketId: string, reason?: string) => ({
    endpoint: `${SUPPORT_ENDPOINTS.adminTickets}/${ticketId}/escalate`,
    method: 'POST' as const,
    body: JSON.stringify({ reason }),
  }),
};
```

#### Step 4: Update Admin Dashboard

**File:** `admin/src/services/api.ts`

**Add new function:**

```typescript
escalateTicket: (apiClient: AxiosInstance, ticketId: string, reason?: string) =>
  apiClient.post<ApiResponse<any>>(`/support/admin/tickets/${ticketId}/escalate`, { reason }),
```

**File:** `admin/src/pages/Support.tsx`

**Add mutation and button:**

```typescript
const escalateMutation = useMutation({
  mutationFn: ({ ticketId, reason }: { ticketId: string; reason?: string }) =>
    apiService.escalateTicket(apiClient, ticketId, reason),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    if (selectedTicket) {
      apiService.getSupportTicket(apiClient, selectedTicket.id).then((response) => {
        setSelectedTicket(response.data.data);
      });
    }
  },
});

// In ticket detail panel, add button:
<button
  onClick={() => {
    const reason = prompt('Escalation reason (optional):');
    escalateMutation.mutate({ ticketId: selectedTicket.id, reason: reason || undefined });
  }}
  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
  disabled={escalateMutation.isPending}
>
  {escalateMutation.isPending ? 'Escalating...' : 'Escalate Ticket'}
</button>
```

### Example 2: Adding a "Reopen" Action

#### Step 1: Update Backend Service

**File:** `api/src/support/support.service.ts`

**Add new method:**

```typescript
/**
 * Reopen closed ticket (admin only)
 */
async reopenTicket(
  ticketId: string,
  adminUserId: string,
): Promise<SupportTicketResponse> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
  }

  if (ticket.status !== 'CLOSED') {
    throw new BadRequestException('Only closed tickets can be reopened');
  }

  await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: 'OPEN',
      // Note: resolvedAt is NOT cleared (historical record)
    },
  });

  return this.getTicketById(ticketId, adminUserId, true);
}
```

#### Step 2: Update Backend Controller

**File:** `api/src/support/support.controller.ts`

**Add new endpoint:**

```typescript
@Post('admin/tickets/:id/reopen')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'Reopen closed ticket (admin)' })
@ApiResponse({ status: 200, description: 'Ticket reopened successfully' })
async reopenTicket(
  @Request() req,
  @Param('id') ticketId: string,
) {
  const adminUserId = req.context.profileUserId;
  const ticket = await this.supportService.reopenTicket(ticketId, adminUserId);
  return wrapResponse(ticket, 'Ticket reopened successfully');
}
```

#### Step 3: Update Admin Dashboard

**File:** `admin/src/services/api.ts`

**Add new function:**

```typescript
reopenTicket: (apiClient: AxiosInstance, ticketId: string) =>
  apiClient.post<ApiResponse<any>>(`/support/admin/tickets/${ticketId}/reopen`),
```

**File:** `admin/src/pages/Support.tsx`

**Add mutation and conditional button:**

```typescript
const reopenMutation = useMutation({
  mutationFn: (ticketId: string) => apiService.reopenTicket(apiClient, ticketId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    if (selectedTicket) {
      apiService.getSupportTicket(apiClient, selectedTicket.id).then((response) => {
        setSelectedTicket(response.data.data);
      });
    }
  },
});

// In ticket detail panel, show button only if ticket is closed:
{selectedTicket.status === 'CLOSED' && (
  <button
    onClick={() => reopenMutation.mutate(selectedTicket.id)}
    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
    disabled={reopenMutation.isPending}
  >
    {reopenMutation.isPending ? 'Reopening...' : 'Reopen Ticket'}
  </button>
)}
```

### Example 3: Adding "Internal Notes" (Staff-Only Messages)

#### Step 1: Update Database Schema

**File:** `api/prisma/schema.prisma`

**Add field to `TicketResponse` model:**

```prisma
model TicketResponse {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  message   String   @db.Text
  isStaff   Boolean  @default(false)
  isInternal Boolean @default(false)  // NEW FIELD - internal notes
  createdAt DateTime @default(now())

  // ... rest of model
}
```

**Run migration:** `npx prisma migrate dev --name add_internal_notes`

#### Step 2: Update Backend Service

**File:** `api/src/support/support.service.ts`

**Add new method:**

```typescript
/**
 * Add internal note to ticket (admin only)
 */
async addInternalNote(
  ticketId: string,
  adminUserId: string,
  message: string,
): Promise<SupportTicketResponse> {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
  }

  await this.prisma.ticketResponse.create({
    data: {
      ticketId,
      userId: adminUserId,
      message,
      isStaff: true,
      isInternal: true,  // Mark as internal
    },
  });

  return this.getTicketById(ticketId, adminUserId, true);
}
```

**Update `transformTicket()` to filter internal notes for non-admins:**

```typescript
private transformTicket(ticket: any, isAdmin: boolean = false): SupportTicketResponse {
  // ... existing code
  
  responses: (ticket.responses || [])
    .filter((r: any) => isAdmin || !r.isInternal)  // Filter internal notes for non-admins
    .map((r: any) => ({
      id: r.id,
      message: r.message,
      isStaff: r.isStaff,
      isInternal: r.isInternal || false,  // Include flag
      createdAt: r.createdAt.toISOString(),
      userName: r.user
        ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown',
    })),
}
```

**Update `getTicketById()` to pass `isAdmin` flag:**

```typescript
async getTicketById(ticketId: string, userId: string, isAdmin: boolean): Promise<SupportTicketResponse> {
  // ... existing code
  return this.transformTicket(ticket, isAdmin);  // Pass isAdmin flag
}
```

#### Step 3: Update Backend Controller

**File:** `api/src/support/support.controller.ts`

**Add new endpoint:**

```typescript
@Post('admin/tickets/:id/internal-note')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'Add internal note (admin)' })
@ApiResponse({ status: 200, description: 'Internal note added successfully' })
async addInternalNote(
  @Request() req,
  @Param('id') ticketId: string,
  @Body('message') message: string,
) {
  const adminUserId = req.context.profileUserId;
  const ticket = await this.supportService.addInternalNote(ticketId, adminUserId, message);
  return wrapResponse(ticket, 'Internal note added successfully');
}
```

#### Step 4: Update Frontend Types

**File:** `frontend/services/supportService.ts`

**Update `TicketResponse` interface:**

```typescript
export interface TicketResponse {
  id: string;
  message: string;
  isStaff: boolean;
  isInternal?: boolean;  // NEW FIELD
  createdAt: string;
  userName?: string;
}
```

#### Step 5: Update Admin Dashboard

**File:** `admin/src/pages/Support.tsx`

**Add internal note form:**

```typescript
const [internalNote, setInternalNote] = useState('');

const addInternalNoteMutation = useMutation({
  mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
    apiService.addInternalNote(apiClient, ticketId, message),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    setInternalNote('');
    if (selectedTicket) {
      apiService.getSupportTicket(apiClient, selectedTicket.id).then((response) => {
        setSelectedTicket(response.data.data);
      });
    }
  },
});

// In ticket detail panel, add internal note section:
<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Internal Note (not visible to customer)
  </label>
  <textarea
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
    rows={2}
    value={internalNote}
    onChange={(e) => setInternalNote(e.target.value)}
    placeholder="Add internal note..."
  />
  <button
    onClick={() => {
      if (internalNote.trim()) {
        addInternalNoteMutation.mutate({ ticketId: selectedTicket.id, message: internalNote });
      }
    }}
    className="mt-2 w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
    disabled={!internalNote.trim() || addInternalNoteMutation.isPending}
  >
    {addInternalNoteMutation.isPending ? 'Adding...' : 'Add Internal Note'}
  </button>
</div>

// In responses display, show internal notes differently:
{selectedTicket.responses.map((response) => (
  <div
    key={response.id}
    className={`border-l-4 ${
      response.isInternal
        ? 'border-yellow-500 bg-yellow-50'
        : response.isStaff
        ? 'border-green-500'
        : 'border-gray-300'
    } pl-4`}
  >
    {response.isInternal && (
      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
        INTERNAL
      </span>
    )}
    {/* ... rest of response display */}
  </div>
))}
```

---

## Adding New Message Types

This guide walks through adding a new message type (e.g., `SYSTEM`, `ATTACHMENT`, `RESOLUTION`).

### Step 1: Update Database Schema

**File:** `api/prisma/schema.prisma`

**Add `type` field to `TicketResponse` model:**

```prisma
model TicketResponse {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  message   String   @db.Text
  isStaff   Boolean  @default(false)
  type      String   @default("TEXT")  // NEW FIELD: TEXT, SYSTEM, ATTACHMENT, RESOLUTION
  createdAt DateTime @default(now())

  // ... rest of model
}
```

**Run migration:** `npx prisma migrate dev --name add_message_type`

### Step 2: Update Backend Service

**File:** `api/src/support/support.service.ts`

**Update `addResponse()` to accept type:**

```typescript
async addResponse(
  ticketId: string,
  userId: string,
  message: string,
  isStaff: boolean,
  type: string = 'TEXT',  // NEW PARAMETER with default
): Promise<SupportTicketResponse> {
  // ... existing validation
  
  await this.prisma.ticketResponse.create({
    data: {
      ticketId,
      userId,
      message,
      isStaff,
      type,  // NEW FIELD
    },
  });

  // ... rest of method
}
```

**Update `transformTicket()` to include type:**

```typescript
private transformTicket(ticket: any): SupportTicketResponse {
  // ... existing code
  
  responses: (ticket.responses || []).map((r: any) => ({
    id: r.id,
    message: r.message,
    isStaff: r.isStaff,
    type: r.type || 'TEXT',  // NEW FIELD with default
    createdAt: r.createdAt.toISOString(),
    userName: r.user
      ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Unknown'
      : 'Unknown',
  })),
}
```

### Step 3: Update Backend DTOs

**File:** `api/src/support/dto/support.dto.ts`

**Update `CreateTicketResponseDto`:**

```typescript
export class CreateTicketResponseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @IsString()
  @IsOptional()
  @IsIn(['TEXT', 'SYSTEM', 'ATTACHMENT', 'RESOLUTION'])
  type?: 'TEXT' | 'SYSTEM' | 'ATTACHMENT' | 'RESOLUTION';
}
```

**Update `SupportTicketResponse` interface:**

```typescript
export interface SupportTicketResponse {
  // ... existing fields
  responses: {
    id: string;
    message: string;
    isStaff: boolean;
    type?: string;  // NEW FIELD
    createdAt: string;
    userName?: string;
  }[];
}
```

### Step 4: Update Backend Controller

**File:** `api/src/support/support.controller.ts`

**Update `respondToTicket()` endpoint:**

```typescript
@Post('tickets/:id/respond')
@ApiOperation({ summary: 'Add a response to a ticket' })
@ApiResponse({ status: 200, description: 'Response added successfully' })
async respondToTicket(
  @Request() req,
  @Param('id') ticketId: string,
  @Body() responseDto: CreateTicketResponseDto,
) {
  const userId = req.context.profileUserId;
  const isAdmin = req.context.role === UserRole.ADMIN || req.context.role === UserRole.SUPER_ADMIN;
  const ticket = await this.supportService.addResponse(
    ticketId,
    userId,
    responseDto.message,
    isAdmin,
    responseDto.type || 'TEXT',  // NEW PARAMETER
  );
  return wrapResponse(ticket, 'Response added successfully');
}
```

### Step 5: Update Frontend Types

**File:** `frontend/services/supportService.ts`

**Update `TicketResponse` interface:**

```typescript
export interface TicketResponse {
  id: string;
  message: string;
  isStaff: boolean;
  type?: 'TEXT' | 'SYSTEM' | 'ATTACHMENT' | 'RESOLUTION';  // NEW FIELD
  createdAt: string;
  userName?: string;
}
```

**Update `CreateTicketResponseData` interface:**

```typescript
export interface CreateTicketResponseData {
  message: string;
  type?: 'TEXT' | 'SYSTEM' | 'ATTACHMENT' | 'RESOLUTION';  // NEW FIELD
}
```

### Step 6: Update Frontend UI Components

**File:** `frontend/pages/foundation/FoundationSupportPage.tsx`

**Update response rendering to handle different types:**

```typescript
{selectedTicket.responses.map(response => {
  // Render based on type
  if (response.type === 'SYSTEM') {
    return (
      <div key={response.id} className="p-2 bg-gray-100 rounded text-xs text-gray-600 italic">
        {response.message}
      </div>
    );
  }
  
  if (response.type === 'RESOLUTION') {
    return (
      <div key={response.id} className="p-4 rounded-lg bg-green-50 border-l-4 border-green-500">
        <div className="flex items-center mb-2">
          <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">Resolution</span>
        </div>
        <p className="text-sm text-gray-700">{response.message}</p>
      </div>
    );
  }
  
  // Default TEXT type rendering
  return (
    <div 
      key={response.id} 
      className={`p-4 rounded-lg ${
        response.isStaff ? 'bg-swiss-teal/10 ml-4' : 'bg-gray-50 mr-4'
      }`}
    >
      {/* ... existing rendering */}
    </div>
  );
})}
```

### Step 7: Update Admin Dashboard

**File:** `admin/src/pages/Support.tsx`

**Update response rendering:**

```typescript
{selectedTicket.responses.map((response) => {
  if (response.type === 'SYSTEM') {
    return (
      <div key={response.id} className="text-xs text-gray-500 italic mb-2">
        {response.message}
      </div>
    );
  }
  
  return (
    <div
      key={response.id}
      className={`border-l-4 ${
        response.isStaff ? 'border-green-500' : 'border-gray-300'
      } pl-4`}
    >
      {response.type === 'RESOLUTION' && (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
          RESOLUTION
        </span>
      )}
      {/* ... rest of response display */}
    </div>
  );
})}
```

### Step 8: Testing Checklist

- [ ] Create response with default type (TEXT)
- [ ] Create response with new type (SYSTEM, ATTACHMENT, etc.)
- [ ] Verify different types render correctly in UI
- [ ] Verify type is saved in database
- [ ] Test validation rejects invalid type
- [ ] Test backward compatibility (existing responses without type)

---

## Next Steps

Continue to **Part 4: Developer Workflow and Compliance Requirements** for strict workflow guidelines and common mistakes to avoid.



# SUPPORT_TICKET_SYSTEM_PART4_WORKFLOW_AND_COMPLIANCE.md

# Support Ticket System Documentation - Part 4: Developer Workflow and Compliance Requirements

## Table of Contents
1. [Developer Workflow Requirements](#developer-workflow-requirements)
2. [Critical Compliance Requirements](#critical-compliance-requirements)
3. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
4. [Testing Expectations](#testing-expectations)

---

## Developer Workflow Requirements

### Strict Workflow for Modifying the Support Ticket System

When modifying the Support Ticket System, developers and AI agents **MUST** follow this exact workflow. Skipping steps or changing the order will result in broken functionality.

### Workflow Steps

#### Step 1: Update Models/Schema

**File:** `api/prisma/schema.prisma`

**Actions:**
1. Modify `SupportTicket` or `TicketResponse` models
2. Add/remove fields as needed
3. Update indexes if adding filterable fields
4. Update relations if needed

**Example:**
```prisma
model SupportTicket {
  // ... existing fields
  newField String?  // NEW FIELD
  @@index([newField])  // ADD INDEX if filtering needed
}
```

**Validation:**
- [ ] Schema syntax is valid
- [ ] All required fields have defaults or are nullable
- [ ] Foreign key relations are correct
- [ ] Indexes added for filterable fields

**Next:** Create and run migration

---

#### Step 2: Create and Run Database Migration

**Command:**
```bash
cd api
npx prisma migrate dev --name descriptive_migration_name
```

**Actions:**
1. Review generated migration SQL
2. Ensure migration is reversible (if needed)
3. Run migration on development database
4. Generate Prisma client: `npx prisma generate`

**Validation:**
- [ ] Migration created successfully
- [ ] Migration SQL is correct
- [ ] Prisma client regenerated
- [ ] No TypeScript errors in generated types

**Next:** Update backend DTOs

---

#### Step 3: Update Backend DTOs

**File:** `api/src/support/dto/support.dto.ts`

**Actions:**
1. Add new fields to `CreateTicketDto` (if creating tickets)
2. Add new fields to `CreateTicketResponseDto` (if adding responses)
3. Add new fields to `UpdateTicketStatusDto` (if updating status)
4. Add validation decorators (`@IsString()`, `@IsOptional()`, `@IsIn()`, etc.)
5. Update `SupportTicketResponse` interface

**Example:**
```typescript
export class CreateTicketDto {
  // ... existing fields
  
  @IsString()
  @IsOptional()
  @MaxLength(100)
  newField?: string;  // NEW FIELD with validation
}

export interface SupportTicketResponse {
  // ... existing fields
  newField?: string;  // NEW FIELD in response
}
```

**Validation:**
- [ ] All new fields have appropriate validation decorators
- [ ] TypeScript types are correct
- [ ] Optional fields marked with `?`
- [ ] Enum values match database constraints

**Next:** Update backend services

---

#### Step 4: Update Backend Services

**File:** `api/src/support/support.service.ts`

**Actions:**
1. Update `createTicket()` to handle new fields
2. Update `getAllTickets()` to support new filters (if applicable)
3. Update `transformTicket()` to include new fields in response
4. Add new methods if adding new actions
5. Update existing methods if business logic changes

**Example:**
```typescript
async createTicket(
  userId: string,
  data: {
    subject: string;
    message: string;
    newField?: string;  // NEW FIELD
  },
): Promise<SupportTicketResponse> {
  const ticket = await this.prisma.supportTicket.create({
    data: {
      userId,
      subject: data.subject,
      message: data.message,
      newField: data.newField,  // NEW FIELD
      // ... rest of fields
    },
    include: { /* ... */ },
  });

  return this.transformTicket(ticket);
}

private transformTicket(ticket: any): SupportTicketResponse {
  return {
    // ... existing fields
    newField: ticket.newField,  // NEW FIELD
    // ... rest of fields
  };
}
```

**Validation:**
- [ ] All new fields are handled in create/update methods
- [ ] `transformTicket()` includes all new fields
- [ ] Business logic is correct
- [ ] Error handling is appropriate
- [ ] Authorization checks are in place

**Next:** Update backend controllers

---

#### Step 5: Update Controllers and Endpoints

**File:** `api/src/support/support.controller.ts`

**Actions:**
1. Update existing endpoints to accept new fields
2. Add new endpoints if adding new actions
3. Update query parameters if adding filters
4. Ensure proper role guards are in place
5. Update Swagger/API documentation decorators

**Example:**
```typescript
@Post('tickets')
@ApiOperation({ summary: 'Create a new support ticket' })
async createTicket(@Request() req, @Body() createTicketDto: CreateTicketDto) {
  const userId = req.context.profileUserId;
  const ticket = await this.supportService.createTicket(userId, createTicketDto);
  return wrapResponse(ticket, 'Ticket created successfully');
}

// NEW ENDPOINT EXAMPLE
@Post('admin/tickets/:id/new-action')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiOperation({ summary: 'New action (admin)' })
async newAction(@Request() req, @Param('id') ticketId: string) {
  const adminUserId = req.context.profileUserId;
  const ticket = await this.supportService.newAction(ticketId, adminUserId);
  return wrapResponse(ticket, 'Action completed successfully');
}
```

**Validation:**
- [ ] All endpoints have proper guards
- [ ] Admin endpoints have `@Roles()` decorator
- [ ] Request/response types are correct
- [ ] API documentation is updated
- [ ] Error responses are handled

**Next:** Update frontend API functions

---

#### Step 6: Update Frontend API Functions

**File:** `frontend/services/supportService.ts`

**Actions:**
1. Update `SupportTicket` interface
2. Update `CreateTicketData` interface
3. Update `TicketResponse` interface (if applicable)
4. Update API config functions to include new fields
5. Add new API functions if adding new actions

**Example:**
```typescript
export interface SupportTicket {
  // ... existing fields
  newField?: string;  // NEW FIELD
}

export interface CreateTicketData {
  // ... existing fields
  newField?: string;  // NEW FIELD
}

export const supportApi = {
  // ... existing functions
  
  createTicketConfig: (data: CreateTicketData) => ({
    endpoint: SUPPORT_ENDPOINTS.tickets,
    method: 'POST' as const,
    body: JSON.stringify(data),  // Includes newField automatically
  }),
  
  // NEW FUNCTION EXAMPLE
  newActionConfig: (ticketId: string) => ({
    endpoint: `${SUPPORT_ENDPOINTS.adminTickets}/${ticketId}/new-action`,
    method: 'POST' as const,
    body: JSON.stringify({}),
  }),
};
```

**Validation:**
- [ ] All TypeScript interfaces are updated
- [ ] API config functions include new fields
- [ ] Endpoint paths are correct
- [ ] Request bodies are properly formatted

**Next:** Update admin API functions

---

#### Step 7: Update Admin API Functions

**File:** `admin/src/services/api.ts`

**Actions:**
1. Update `SupportTicket` type in `admin/src/types/index.ts`
2. Update API service functions to include new fields/filters
3. Add new API functions if adding new actions

**Example:**
```typescript
// In admin/src/types/index.ts
export interface SupportTicket {
  // ... existing fields
  newField?: string;  // NEW FIELD
}

// In admin/src/services/api.ts
getSupportTickets: (apiClient: AxiosInstance, filters?: {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  newField?: string;  // NEW FILTER
}) => {
  const params = new URLSearchParams();
  // ... existing params
  if (filters?.newField) params.append('newField', filters.newField);
  
  return apiClient.get<ApiResponse<any[]>>(
    `/support/admin/tickets${params.toString() ? `?${params.toString()}` : ''}`
  );
},
```

**Validation:**
- [ ] Type definitions are updated
- [ ] Query parameters are built correctly
- [ ] API calls match backend endpoints
- [ ] TypeScript types are correct

**Next:** Update UI components

---

#### Step 8: Update UI Components

**Files:**
- `frontend/pages/foundation/FoundationSupportPage.tsx`
- `admin/src/pages/Support.tsx`

**Actions:**
1. Add state for new fields (if user input)
2. Add form inputs for new fields
3. Update form submission handlers
4. Update display components to show new fields
5. Add filters if applicable
6. Update badge/status displays if applicable

**Example:**
```typescript
// Add state
const [newField, setNewField] = useState('');

// Add form input
<input
  type="text"
  value={newField}
  onChange={(e) => setNewField(e.target.value)}
  className={STANDARD_INPUT_FIELD}
/>

// Update submission
const config = supportApi.createTicketConfig({
  subject: ticketSubject,
  message: ticketMessage,
  newField: newField,  // NEW FIELD
});

// Display new field
{selectedTicket.newField && (
  <div className="text-sm text-gray-600">
    New Field: {selectedTicket.newField}
  </div>
)}
```

**Validation:**
- [ ] All form inputs are properly bound to state
- [ ] Form validation is in place
- [ ] New fields are displayed correctly
- [ ] Loading and error states handle new fields
- [ ] UI is responsive and accessible

**Next:** Validate permission rules

---

#### Step 9: Validate Permission Rules

**Actions:**
1. Verify customer endpoints are accessible to all authenticated users
2. Verify admin endpoints require `ADMIN` or `SUPER_ADMIN` role
3. Verify customers can only access their own tickets
4. Verify admins can access all tickets
5. Test authorization edge cases

**Checklist:**
- [ ] Customer creates ticket → Success
- [ ] Customer views own ticket → Success
- [ ] Customer views other's ticket → 403 Forbidden
- [ ] Customer responds to own ticket → Success
- [ ] Customer responds to other's ticket → 403 Forbidden
- [ ] Admin views any ticket → Success
- [ ] Admin updates status → Success
- [ ] Admin assigns ticket → Success
- [ ] Non-admin tries admin endpoint → 403 Forbidden

**Next:** Test ticket creation, updates, messaging, and status/priority logic

---

#### Step 10: Test Ticket Creation, Updates, Messaging, and Status/Priority Logic

**Test Scenarios:**

**Ticket Creation:**
- [ ] Create ticket with all required fields → Success
- [ ] Create ticket with optional fields → Success
- [ ] Create ticket with invalid data → Validation error
- [ ] Create ticket without authentication → 401 Unauthorized
- [ ] Verify ticket appears in user's ticket list
- [ ] Verify ticket has correct default values

**Ticket Updates:**
- [ ] Admin updates status → Success
- [ ] Admin updates status to invalid value → Validation error
- [ ] Non-admin tries to update status → 403 Forbidden
- [ ] Status change triggers `resolvedAt` when appropriate
- [ ] Verify status change appears in UI immediately

**Messaging:**
- [ ] Customer responds to own ticket → Success
- [ ] Customer responds to other's ticket → 403 Forbidden
- [ ] Admin responds to any ticket → Success
- [ ] Response appears in message thread
- [ ] Staff response to OPEN ticket triggers status change
- [ ] Response includes correct `isStaff` flag

**Status/Priority Logic:**
- [ ] All status transitions work correctly
- [ ] Priority filtering works in admin dashboard
- [ ] Status filtering works in admin dashboard
- [ ] Badge colors display correctly
- [ ] Statistics include all statuses/priorities

**Next:** Run full regression on ticket list, filters, and details page

---

#### Step 11: Run Full Regression on Ticket List, Filters, and Details Page

**Ticket List:**
- [ ] List loads without errors
- [ ] Tickets display all fields correctly
- [ ] Sorting works (if implemented)
- [ ] Pagination works (if implemented)
- [ ] Empty state displays when no tickets
- [ ] Loading state displays during fetch
- [ ] Error state displays on failure

**Filters:**
- [ ] Status filter works
- [ ] Priority filter works
- [ ] Category filter works
- [ ] Search filter works
- [ ] Multiple filters work together
- [ ] Clearing filters resets list
- [ ] Filter state persists (if applicable)

**Details Page:**
- [ ] Ticket details load correctly
- [ ] All fields display correctly
- [ ] Message thread displays correctly
- [ ] Response form works
- [ ] Status change works (admin)
- [ ] Assignment works (admin)
- [ ] All actions work without errors

**Next:** Mark work as complete

---

## Critical Compliance Requirements

### All Developers MUST Follow These Rules

#### 1. Follow Existing Architecture Patterns

**❌ DO NOT:**
- Create new patterns without discussing with team
- Mix different state management approaches
- Use different API response formats
- Bypass existing authentication/authorization

**✅ DO:**
- Use existing DTO validation patterns
- Follow existing service layer structure
- Use existing error handling patterns
- Follow existing API response envelope format

#### 2. Never Bypass Backend Validation

**❌ DO NOT:**
- Remove validation decorators from DTOs
- Skip validation in service methods
- Allow frontend-only validation
- Trust client-side data without server validation

**✅ DO:**
- Always validate in DTOs using `class-validator`
- Always validate in service methods
- Always check authorization before operations
- Always sanitize user input

#### 3. Never Hardcode Logic That Belongs in Services or Controllers

**❌ DO NOT:**
- Put business logic in frontend components
- Hardcode status transitions in UI
- Calculate statistics in frontend
- Duplicate validation logic in multiple places

**✅ DO:**
- Put business logic in backend services
- Use backend for all calculations
- Centralize validation in DTOs
- Keep UI as presentation layer only

#### 4. Never Duplicate Business Rules in the Frontend

**❌ DO NOT:**
- Copy status transition rules to frontend
- Duplicate validation rules
- Hardcode allowed values in multiple places
- Create frontend-only business logic

**✅ DO:**
- Use backend as single source of truth
- Fetch allowed values from backend if needed
- Use TypeScript types for type safety
- Keep business rules in one place (backend)

#### 5. Always Maintain Correct Permissions (Agent vs Customer)

**❌ DO NOT:**
- Allow customers to access admin endpoints
- Allow customers to see other users' tickets
- Allow customers to change ticket status
- Skip authorization checks

**✅ DO:**
- Always check user role before admin operations
- Always verify ticket ownership for customers
- Always use `@Roles()` decorator on admin endpoints
- Always test authorization edge cases

#### 6. Always Update All Dependent Files When Adding New Fields, Statuses, or Behaviors

**❌ DO NOT:**
- Add field to schema but forget DTO
- Add status but forget UI badge
- Add filter but forget backend service
- Update backend but forget frontend

**✅ DO:**
- Follow the complete workflow (Steps 1-11)
- Update all files in the correct order
- Test each step before moving to next
- Use checklist to ensure nothing is missed

#### 7. Always Fully Test the End-to-End Flow Before Calling Work Complete

**❌ DO NOT:**
- Test only happy path
- Skip edge cases
- Test only one user role
- Assume existing tests cover new code

**✅ DO:**
- Test all user roles
- Test all edge cases
- Test error scenarios
- Test backward compatibility
- Test with real data

### Failure to Follow These Rules Results In:

- **Broken ticket flows:** Tickets not created, updated, or displayed correctly
- **Incorrect ticket sorting/filtering:** Filters don't work, sorting breaks
- **Permission/security issues:** Users can access unauthorized data
- **Inconsistent system behavior:** Different parts of system behave differently
- **Technical debt:** Code becomes harder to maintain and extend

---

## Common Mistakes to Avoid

### Mistake 1: Adding a Field to the Schema But Not Updating DTOs

**❌ WRONG:**
```prisma
// schema.prisma
model SupportTicket {
  newField String  // Added field
}
```

```typescript
// support.dto.ts - NOT UPDATED
export class CreateTicketDto {
  subject: string;
  message: string;
  // newField missing!
}
```

**Result:** Backend rejects requests with new field, or field is ignored.

**✅ CORRECT:**
```typescript
// support.dto.ts
export class CreateTicketDto {
  subject: string;
  message: string;
  newField?: string;  // Added with validation
}
```

**Also update:**
- `SupportTicketResponse` interface
- `createTicket()` service method
- `transformTicket()` method
- Frontend types and forms

---

### Mistake 2: Adding a New Status But Not Updating Filtering UI

**❌ WRONG:**
```typescript
// support.service.ts
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
```

```typescript
// Support.tsx - Filter dropdown NOT UPDATED
<select>
  <option value="OPEN">Open</option>
  <option value="IN_PROGRESS">In Progress</option>
  <option value="RESOLVED">Resolved</option>
  <option value="CLOSED">Closed</option>
  {/* ESCALATED missing! */}
</select>
```

**Result:** Users cannot filter by new status, even though backend supports it.

**✅ CORRECT:**
```typescript
// Support.tsx
<select>
  <option value="OPEN">Open</option>
  <option value="IN_PROGRESS">In Progress</option>
  <option value="RESOLVED">Resolved</option>
  <option value="CLOSED">Closed</option>
  <option value="ESCALATED">Escalated</option>  {/* Added */}
</select>
```

**Also update:**
- Status change dropdown
- Badge styling function
- Statistics display (if applicable)
- Frontend type definitions

---

### Mistake 3: Hardcoding UI Values Instead of Using Enums/Data Sources

**❌ WRONG:**
```typescript
// FoundationSupportPage.tsx
<select>
  <option value="LOW">Low</option>
  <option value="MEDIUM">Medium</option>
  <option value="HIGH">High</option>
  <option value="URGENT">Urgent</option>
  {/* Hardcoded - will break if backend adds new priority */}
</select>
```

**Result:** When backend adds new priority, UI doesn't show it without code change.

**✅ CORRECT:**
```typescript
// FoundationSupportPage.tsx
<select>
  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</select>
```

**Benefits:**
- Automatically includes new values when enum is updated
- Single source of truth
- Easier to maintain

---

### Mistake 4: Forgetting to Update Backend Validation

**❌ WRONG:**
```typescript
// support.service.ts
async updateTicketStatus(ticketId: string, status: string) {
  // No validation - accepts any string!
  await this.prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },  // Could be "INVALID_STATUS"!
  });
}
```

**Result:** Invalid statuses can be saved to database, breaking the system.

**✅ CORRECT:**
```typescript
// support.dto.ts
export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

// support.service.ts
async updateTicketStatus(ticketId: string, status: string) {
  if (!ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    throw new BadRequestException(`Invalid status: ${status}`);
  }
  // ... rest of method
}
```

**Also:**
- Validate in DTO (automatic with NestJS)
- Validate in service (defense in depth)
- Return clear error messages

---

### Mistake 5: Not Returning Correct API Shapes

**❌ WRONG:**
```typescript
// support.service.ts
async getTicketById(ticketId: string) {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    // Missing include - no relations loaded!
  });
  
  return ticket;  // Returns Prisma object, not SupportTicketResponse
}
```

**Result:** Frontend receives unexpected data shape, breaks UI.

**✅ CORRECT:**
```typescript
// support.service.ts
async getTicketById(ticketId: string, userId: string, isAdmin: boolean) {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      responses: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  
  return this.transformTicket(ticket);  // Returns SupportTicketResponse
}
```

**Also:**
- Always use `transformTicket()` to ensure consistent shape
- Always include required relations
- Always format dates to ISO strings
- Always match `SupportTicketResponse` interface

---

### Mistake 6: Skipping Authorization Checks

**❌ WRONG:**
```typescript
// support.service.ts
async getTicketById(ticketId: string, userId: string) {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
  
  return this.transformTicket(ticket);  // No authorization check!
}
```

**Result:** Users can access any ticket, including other users' tickets.

**✅ CORRECT:**
```typescript
// support.service.ts
async getTicketById(ticketId: string, userId: string, isAdmin: boolean) {
  const ticket = await this.prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });
  
  if (!ticket) {
    throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
  }
  
  // Authorization check
  if (!isAdmin && ticket.userId !== userId) {
    throw new ForbiddenException('You do not have access to this ticket');
  }
  
  return this.transformTicket(ticket);
}
```

**Always:**
- Check if user owns resource OR is admin
- Throw `ForbiddenException` for unauthorized access
- Test with different user roles

---

### Mistake 7: Not Testing Backward Compatibility

**❌ WRONG:**
- Adding required field without default
- Changing field type
- Removing field that existing code uses
- Not handling null/undefined gracefully

**Result:** Existing tickets break, existing code fails.

**✅ CORRECT:**
- Make new fields optional or provide defaults
- Handle null/undefined in all code paths
- Test with existing data
- Use migrations to update existing records if needed

**Example:**
```typescript
// Make field optional
newField?: string;

// Or provide default in schema
newField String @default("")

// Handle in code
const value = ticket.newField || 'default value';
```

---

## Testing Expectations

### Minimum Testing Requirements

Before marking work as complete, you **MUST** test:

#### 1. Ticket Creation
- [ ] Create ticket with all fields
- [ ] Create ticket with minimal fields
- [ ] Create ticket with invalid data (should fail)
- [ ] Create ticket without authentication (should fail)
- [ ] Verify ticket appears in list
- [ ] Verify ticket has correct default values

#### 2. Ticket Updates
- [ ] Update status (all valid statuses)
- [ ] Update status to invalid value (should fail)
- [ ] Update as customer (should fail)
- [ ] Update as admin (should succeed)
- [ ] Verify status change appears immediately

#### 3. Messaging
- [ ] Customer responds to own ticket
- [ ] Customer responds to other's ticket (should fail)
- [ ] Admin responds to any ticket
- [ ] Verify response appears in thread
- [ ] Verify `isStaff` flag is correct
- [ ] Verify status auto-updates when staff responds

#### 4. Status/Priority Logic
- [ ] All status transitions work
- [ ] Priority filtering works
- [ ] Status filtering works
- [ ] Badge colors are correct
- [ ] Statistics are accurate

#### 5. Authorization
- [ ] Customer can only see own tickets
- [ ] Customer cannot access admin endpoints
- [ ] Admin can see all tickets
- [ ] Admin can access admin endpoints
- [ ] Unauthorized requests return 403

#### 6. Filters and Search
- [ ] All filters work individually
- [ ] Multiple filters work together
- [ ] Search works on subject and message
- [ ] Clearing filters resets list
- [ ] Filters persist during session (if applicable)

#### 7. Edge Cases
- [ ] Empty ticket list displays correctly
- [ ] Ticket with no responses displays correctly
- [ ] Ticket with many responses displays correctly
- [ ] Very long subject/message displays correctly
- [ ] Special characters in search work correctly

#### 8. Error Handling
- [ ] Network errors display user-friendly message
- [ ] Validation errors display correctly
- [ ] 403 errors display correctly
- [ ] 404 errors display correctly
- [ ] Loading states display during operations

#### 9. Backward Compatibility
- [ ] Existing tickets still work
- [ ] Existing API calls still work
- [ ] Existing UI still works
- [ ] No breaking changes introduced

#### 10. Performance
- [ ] Ticket list loads in reasonable time
- [ ] Filters apply quickly
- [ ] Large ticket lists don't freeze UI
- [ ] Multiple rapid requests don't break system

### Testing Tools

**Recommended:**
- Manual testing in browser
- Postman/Insomnia for API testing
- React DevTools for state inspection
- Network tab for API calls
- Console for errors

**Optional (but recommended):**
- Unit tests for services
- Integration tests for endpoints
- E2E tests for critical flows

---

## Summary

Following this workflow and compliance requirements ensures:
- ✅ Consistent code quality
- ✅ Maintainable codebase
- ✅ Secure system
- ✅ Reliable functionality
- ✅ Easy to extend

**Remember:** When in doubt, follow the workflow. When unsure, test thoroughly. When stuck, refer back to this documentation.

---

## Quick Reference Checklist

When modifying the Support Ticket System:

- [ ] Step 1: Update models/schema
- [ ] Step 2: Create and run migration
- [ ] Step 3: Update backend DTOs
- [ ] Step 4: Update backend services
- [ ] Step 5: Update controllers and endpoints
- [ ] Step 6: Update frontend API functions
- [ ] Step 7: Update admin API functions
- [ ] Step 8: Update UI components
- [ ] Step 9: Validate permission rules
- [ ] Step 10: Test ticket creation, updates, messaging, and status/priority logic
- [ ] Step 11: Run full regression on ticket list, filters, and details page

**Compliance:**
- [ ] Followed existing architecture patterns
- [ ] Did not bypass backend validation
- [ ] Did not hardcode business logic in frontend
- [ ] Did not duplicate business rules
- [ ] Maintained correct permissions
- [ ] Updated all dependent files
- [ ] Fully tested end-to-end flow

---

**End of Documentation**

For questions or clarifications, refer to the codebase examples in Parts 1-3 or consult with the development team.



