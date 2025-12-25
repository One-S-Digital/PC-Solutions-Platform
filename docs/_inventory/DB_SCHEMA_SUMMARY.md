# Database Schema Summary

High-level overview of the database models and their relationships.

**Database:** PostgreSQL  
**ORM:** Prisma  
**Schema File:** `api/prisma/schema.prisma`

**Last Updated:** Based on codebase analysis

---

## Core User Models

### User
**Table:** `users`

**Purpose:** Main user profile with role and authentication info.

**Key Fields:**
- `id` (UUID, primary key)
- `clerkId` (String, unique) - Clerk authentication ID
- `email` (String, unique)
- `firstName`, `lastName`
- `role` (UserRole enum)
- `phoneNumber`, `workExperience`, `education`
- `certifications` (String array)
- `skills` (String array)
- `availability`, `availabilitySettings` (JSON)
- `cvUrl`, `shortBio`
- `stripeCustomerId` (String, unique)
- `avatarAssetId`, `coverAssetId` (Asset references)

**Relations:**
- `contactInfo` (UserContactInfo)
- `organizations` (UserOrganization[])
- `applications` (JobApplication[])
- `subscriptions` (UserSubscription[], Subscription[])
- `conversations` (ConversationParticipant[])
- `sentMessages`, `receivedMessages` (Message[])
- `supportTickets` (SupportTicket[])

---

### AppUser
**Table:** `app_users`

**Purpose:** Minimal user record for authentication and role management (separate from User profile).

**Key Fields:**
- `id` (UUID, primary key)
- `clerkId` (String, unique)
- `email` (String, unique)
- `role` (UserRole enum)

**Relations:**
- `assets` (Asset[]) - Files uploaded by user
- `roleHistory` (AppUserRoleHistory[])
- `createdCourses` (Course[])

**Note:** This is a separate table from `User` to handle role management independently from profile data.

---

### UserContactInfo
**Table:** `user_contact_infos`

**Purpose:** Separate contact email from authentication email.

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (String, unique, foreign key to User)
- `contactEmail` (String)

---

## Organization Models

### Organization
**Table:** `organizations`

**Purpose:** Organizations (foundations, suppliers, service providers).

**Key Fields:**
- `id` (UUID, primary key)
- `name`, `type` (OrganizationType enum: FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER)
- `region`, `description`, `vatNumber`
- `contactPerson`, `phoneNumber`
- `canton`, `regionsServed` (String array)
- `languages` (String array)
- `capacity` (Int) - For foundations
- `pedagogy` (String array) - For foundations
- `productCategory`, `productCategories` (String array) - For suppliers
- `serviceType`, `serviceCategories` (String array) - For service providers
- `minimumOrderQuantity`, `directOrderLink`, `catalogUrl` - For suppliers
- `deliveryType`, `bookingLink` - For service providers
- `logoAssetId`, `coverAssetId` (Asset references)

**Relations:**
- `contactInfo` (OrganizationContactInfo)
- `members` (UserOrganization[])
- `products` (Product[])
- `services` (Service[])
- `jobListings` (JobListing[])
- `subscriptions` (Subscription[])
- `orders` (Order[])
- `serviceRequests` (ServiceRequest[])
- `sentInquiries`, `receivedInquiries` (Inquiry[])
- `promoCodes` (PromoCode[])
- `vendorClientsAsVendor`, `vendorClientsAsOrg` (VendorClient[])

---

### UserOrganization
**Table:** `user_organizations`

**Purpose:** Many-to-many relationship between users and organizations.

**Key Fields:**
- `userId` (String, foreign key)
- `organizationId` (String, foreign key)
- `role` (UserRole enum)
- `createdAt` (DateTime)

**Composite Primary Key:** `[userId, organizationId]`

---

## Marketplace Models

### Product
**Table:** `products`

**Purpose:** Products listed by suppliers.

**Key Fields:**
- `id` (UUID, primary key)
- `title`, `subtitle`, `description`
- `price`, `priceCurrency` (default: CHF)
- `category`, `primaryCategory`, `categories` (String array)
- `tags`, `productHighlights` (String arrays)
- `status` (String: ACTIVE, INACTIVE, PENDING, REJECTED)
- `availabilityStatus` (ProductAvailabilityStatus enum)
- `sku`, `vendorSku`, `ean`
- `minOrderQuantity`, `maxOrderQuantity`
- `stockStatus`, `deliveryLeadTimeDays`
- `supplierId` (String, foreign key to Organization)
- `imageAssetId` (Asset reference)

**Relations:**
- `supplier` (Organization)
- `orders` (OrderItem[])

---

### Service
**Table:** `services`

**Purpose:** Services listed by service providers.

**Key Fields:**
- `id` (UUID, primary key)
- `title`, `description`
- `category` (ServiceCategory enum), `categories` (String array)
- `price`, `priceInfo`
- `availability`, `deliveryType` (default: "On-site")
- `tags` (String array)
- `imageUrl`
- `isActive` (Boolean)
- `providerId` (String, foreign key to ServiceProvider)

**Relations:**
- `provider` (ServiceProvider)
- `requests` (ServiceRequest[])

---

### ServiceProvider
**Table:** `service_providers`

**Purpose:** Service provider organization details.

**Key Fields:**
- `id` (UUID, primary key)
- `organizationId` (String, unique, foreign key to Organization)
- `deliveryType` (String)
- `bookingLink` (String)

**Relations:**
- `organization` (Organization)
- `services` (Service[])

---

### Order
**Table:** `orders`

**Purpose:** Orders placed by foundations.

**Key Fields:**
- `id` (UUID, primary key)
- `organizationId` (String, foreign key to Organization)
- `totalAmount` (Float)
- `status` (String, default: "PENDING")
- `createdAt`, `updatedAt`

**Relations:**
- `organization` (Organization)
- `items` (OrderItem[])

---

### OrderItem
**Table:** `order_items`

**Purpose:** Individual items in an order.

**Key Fields:**
- `id` (UUID, primary key)
- `orderId` (String, foreign key)
- `productId` (String, foreign key)
- `quantity` (Int)
- `price` (Float)

**Relations:**
- `order` (Order)
- `product` (Product)

---

### Inquiry
**Table:** `inquiries`

**Purpose:** Inquiries from foundations to suppliers.

**Key Fields:**
- `id` (UUID, primary key)
- `organizationId` (String, foreign key - buyer)
- `supplierId` (String, foreign key - supplier)
- `subject`, `message`
- `productInterest`, `quantity`, `budget`, `urgency`
- `contactName`, `contactEmail`, `contactPhone`
- `preferredContactMethod`
- `status` (InquiryStatus enum: NEW, PENDING, CONTACTED, QUOTED, FULFILLED, DECLINED, CANCELLED)
- `supplierNotes`, `responseMessage`
- `quotedAmount` (Float)
- `respondedAt`, `fulfilledAt`

**Relations:**
- `organization` (Organization - buyer)
- `supplier` (Organization - supplier)

---

## Recruitment Models

### JobListing
**Table:** `job_listings`

**Purpose:** Job postings by foundations.

**Key Fields:**
- `id` (UUID, primary key)
- `title`, `description`
- `requirements`, `benefits`, `responsibilities`, `qualifications` (String arrays)
- `location`, `salary`, `salaryRange`
- `contractType` (JobContractType enum)
- `startDate` (DateTime)
- `status` (JobStatus enum: DRAFT, PUBLISHED, CLOSED, FILLED)
- `foundationId` (String, foreign key to Organization)
- `publishedAt` (DateTime)

**Relations:**
- `foundation` (Organization)
- `applications` (JobApplication[])

---

### JobApplication
**Table:** `job_applications`

**Purpose:** Applications from educators to job listings.

**Key Fields:**
- `id` (UUID, primary key)
- `jobListingId` (String, foreign key)
- `candidateId` (String, foreign key to User)
- `coverLetter` (String)
- `cvUrl` (String)
- `cvAssetId` (String, Asset reference)
- `status` (ApplicationStatus enum: PENDING, REVIEWED, ACCEPTED, REJECTED)
- `createdAt`, `updatedAt`

**Unique Constraint:** `[jobListingId, candidateId]`

**Relations:**
- `jobListing` (JobListing)
- `candidate` (User)

---

## Lead Management Models

### ParentLead
**Table:** `parent_leads`

**Purpose:** Leads submitted by parents looking for childcare.

**Key Fields:**
- `id` (UUID, primary key)
- `parentName`, `parentEmail`, `parentPhone`
- `childName`, `childAge` (Int)
- `message` (String)
- `foundationId` (String, foreign key to Organization, optional)
- `preferredLocation`, `preferredLanguages` (String array)
- `specialRequirements` (String)
- `source` (String)
- `status` (String, default: "NEW")
- `createdAt`, `updatedAt`

**Relations:**
- `foundationResponses` (FoundationLeadResponse[])

---

### FoundationLeadResponse
**Table:** `foundation_lead_responses`

**Purpose:** Responses from foundations to parent leads.

**Key Fields:**
- `id` (UUID, primary key)
- `leadId` (String, foreign key)
- `foundationId` (String, foreign key to Organization)
- `status` (String: INTERESTED, NOT_INTERESTED, NEEDS_MORE_INFO, ENROLLED)
- `message` (String)
- `respondedAt` (DateTime)

**Unique Constraint:** `[leadId, foundationId]`

**Relations:**
- `lead` (ParentLead)
- `foundation` (Organization)

---

## Messaging Models

### Conversation
**Table:** `conversations`

**Purpose:** Conversation containers for messages.

**Key Fields:**
- `id` (UUID, primary key)
- `type` (ConversationType enum: DIRECT, GROUP, SUPPORT)
- `title` (String, optional)
- `lastMessageAt` (DateTime)
- `createdAt`, `updatedAt`

**Relations:**
- `participants` (ConversationParticipant[])
- `messages` (Message[])

---

### ConversationParticipant
**Table:** `conversation_participants`

**Purpose:** Users participating in conversations.

**Key Fields:**
- `id` (UUID, primary key)
- `conversationId` (String, foreign key)
- `userId` (String, foreign key to User)
- `joinedAt` (DateTime)
- `lastReadAt` (DateTime)
- `isActive` (Boolean)

**Unique Constraint:** `[conversationId, userId]`

**Relations:**
- `conversation` (Conversation)
- `user` (User)

---

### Message
**Table:** `messages`

**Purpose:** Individual messages in conversations.

**Key Fields:**
- `id` (UUID, primary key)
- `conversationId` (String, foreign key, optional)
- `senderId` (String, foreign key to User)
- `receiverId` (String, foreign key to User, optional - for direct messages)
- `content` (String)
- `messageType` (MessageType enum: TEXT, FILE, IMAGE, SYSTEM)
- `fileUrl`, `fileName`, `fileSize`, `mimeType`
- `isRead` (Boolean)
- `createdAt` (DateTime)

**Relations:**
- `conversation` (Conversation)
- `sender` (User)
- `receiver` (User)

---

## Support Ticket Models

### SupportTicket
**Table:** `support_tickets`

**Purpose:** Support tickets from users.

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (String, foreign key to User)
- `subject`, `message` (Text)
- `attachmentUrl`, `attachmentName`, `attachmentSize`, `attachmentMimeType`
- `category` (String, default: "GENERAL")
- `priority` (String, default: "MEDIUM")
- `status` (String, default: "OPEN")
- `assignedTo` (String, foreign key to User, optional)
- `resolvedAt` (DateTime)
- `createdAt`, `updatedAt`

**Relations:**
- `user` (User)
- `assignee` (User)
- `responses` (TicketResponse[])

---

### TicketResponse
**Table:** `ticket_responses`

**Purpose:** Responses to support tickets.

**Key Fields:**
- `id` (UUID, primary key)
- `ticketId` (String, foreign key)
- `userId` (String, foreign key to User)
- `message` (Text)
- `attachmentUrl`, `attachmentName`, `attachmentSize`, `attachmentMimeType`
- `isStaff` (Boolean)
- `createdAt` (DateTime)

**Relations:**
- `ticket` (SupportTicket)
- `user` (User)

---

## E-Learning Models

### Course
**Table:** `courses`

**Purpose:** E-Learning courses.

**Key Fields:**
- `id` (UUID, primary key)
- `title`, `description`, `shortDescription`
- `categoryId` (String, foreign key, optional)
- `difficultyLevel` (String)
- `estimatedDuration` (Int, minutes)
- `thumbnailUrl` (String)
- `status` (CourseStatus enum: DRAFT, PUBLISHED, ARCHIVED)
- `createdBy` (String, foreign key to AppUser)
- `createdAt`, `updatedAt`

**Relations:**
- `category` (CourseCategory)
- `creator` (AppUser)
- `modules` (CourseModule[])
- `enrollments` (CourseEnrollment[])
- `discussions` (CourseDiscussion[])
- `certificates` (Certificate[])

---

### CourseEnrollment
**Table:** `course_enrollments`

**Purpose:** User enrollments in courses.

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (String, foreign key to User)
- `courseId` (String, foreign key)
- `enrolledAt` (DateTime)
- `completedAt` (DateTime)
- `progressPercentage` (Decimal)
- `lastAccessedAt` (DateTime)

**Unique Constraint:** `[userId, courseId]`

**Relations:**
- `user` (User)
- `course` (Course)
- `progress` (LessonProgress[])
- `quizAttempts` (QuizAttempt[])

---

## Subscription Models

### SubscriptionPlan
**Table:** `subscription_plans`

**Purpose:** Available subscription plans.

**Key Fields:**
- `id` (UUID, primary key)
- `name`, `code` (String, unique), `description`
- `price` (Float), `currency` (default: CHF)
- `billingPeriod` (String, default: "monthly")
- `features` (String array)
- `limits` (JSON)
- `allowedRoles` (String array)
- `trialDays` (Int, default: 0)
- `isActive`, `isPopular` (Boolean)
- `displayOrder` (Int)
- `stripePriceId`, `stripeProductId` (String, optional)

**Relations:**
- `subscriptions` (Subscription[])
- `subscriptionRequests` (SubscriptionRequest[])

---

### Subscription
**Table:** `subscriptions`

**Purpose:** Active subscriptions for users or organizations.

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (String, foreign key, optional)
- `organizationId` (String, foreign key, optional)
- `planId` (String, foreign key)
- `tier` (SubscriptionTier enum)
- `status` (SubscriptionStatus enum)
- `currentPeriodStart`, `currentPeriodEnd` (DateTime)
- `trialStart`, `trialEnd` (DateTime)
- `pausedAt`, `pausedUntil` (DateTime)
- `cancelAtPeriodEnd` (Boolean)
- `canceledAt` (DateTime)
- `cancellationReason` (String)
- `stripeSubscriptionId`, `stripeCustomerId` (String, optional)
- `isManual` (Boolean, default: true)
- `activatedBy`, `activatedAt` (String, DateTime)
- `gracePeriodEnd` (DateTime)
- `notes` (Text)
- `metadata` (JSON)

**Relations:**
- `user` (User)
- `organization` (Organization)
- `plan` (SubscriptionPlan)
- `transactions` (BillingTransaction[])
- `actions` (SubscriptionAction[])
- `schedules` (SubscriptionSchedule[])
- `subscriptionNotes` (SubscriptionNote[])
- `subscriptionRequest` (SubscriptionRequest)
- `cancellationRequests` (SubscriptionCancellationRequest[])

---

### SubscriptionRequest
**Table:** `subscription_requests`

**Purpose:** Subscription requests awaiting admin approval.

**Key Fields:**
- `id` (UUID, primary key)
- `userId`, `organizationId` (String, optional)
- `planId` (String, foreign key)
- `tier` (SubscriptionTier enum)
- `billingPeriod` (String)
- `contactName`, `contactEmail`, `contactPhone`
- `preferredContact` (String)
- `message`, `notes` (Text)
- `status` (SubscriptionRequestStatus enum)
- `invoiceNumber`, `invoiceSentAt`, `invoiceAmount`, `invoiceCurrency`
- `paymentReceivedAt`, `paymentReference`
- `subscriptionId` (String, foreign key, unique)
- `reviewedAt`, `reviewedBy`, `processedAt`, `processedBy`
- `declinedAt`, `declinedBy`, `declineReason`

**Relations:**
- `user` (User)
- `organization` (Organization)
- `plan` (SubscriptionPlan)
- `subscription` (Subscription)

---

## Asset Model

### Asset
**Table:** `assets`

**Purpose:** File uploads and media assets.

**Key Fields:**
- `id` (UUID, primary key)
- `kind` (AssetKind enum)
- `filename`, `publicUrl`, `storageKey`
- `mimeType`, `size` (Int)
- `uploadedById` (String, foreign key to AppUser)
- `etag`, `checksum` (String)
- `version` (Int)
- `category`, `contentCategory` (String)
- `title`, `description`
- `contentType`, `language`, `accessRoles` (String array)
- `status` (String, default: "Draft")
- `tags` (String array)
- E-Learning fields: `duration`, `lessons`, `videoSourceType`
- HR Document fields: `fileType`, `versionNumber`, `effectiveDate`, `reviewDate`
- State Policy fields: `country`, `region`, `policyType`, `isCritical`, `expirationDate`, `externalLink`
- Crawler fields: `crawlSourceId`, `officialUrl`, `contentHash`, `lastCrawledAt`, `crawlStatus`

**Relations:**
- `uploader` (AppUser)
- `organizationLogos`, `organizationCovers` (Organization[])
- `userAvatars`, `userCovers` (User[])
- `products` (Product[])
- `catalogPdfs`, `catalogCsvs` (Catalog[])
- `organizationDocuments` (OrganizationDocument[])
- `frontendLogos`, `frontendFavicons`, `frontendOgImages` (FrontendSettings[])
- `adminLogos`, `adminFavicons`, `sidebarLogos` (FrontendSettings[])
- `crawlSource` (CantonSource)

---

## Calendar Model

### CalendarEvent
**Table:** `calendar_events`

**Purpose:** Calendar events for foundations.

**Key Fields:**
- `id` (UUID, primary key)
- `organizationId` (String, foreign key)
- `title`, `description` (Text)
- `eventType` (String)
- `startTime`, `endTime` (DateTime)
- `allDay` (Boolean)
- `location` (String)
- `relatedEntityType`, `relatedEntityId` (String)
- `createdBy` (String, foreign key to User, optional)
- `createdAt`, `updatedAt`

**Relations:**
- `organization` (Organization)
- `creator` (User)

---

## Vendor Client Model

### VendorClient
**Table:** `vendor_clients`

**Purpose:** Tracks vendor-client relationships for discount termination workflow.

**Key Fields:**
- `id` (UUID, primary key)
- `vendorId` (String, foreign key to Organization)
- `orgId` (String, foreign key to Organization)
- `isActive` (Boolean)
- `reason` (VendorClientReason enum)
- `note` (String)
- `markedByUserId` (String, foreign key to User)
- `markedAt` (DateTime)
- `deactivatedAt`, `lastAdminNotifiedAt` (DateTime)

**Unique Constraint:** `[vendorId, orgId]`

**Relations:**
- `vendor` (Organization)
- `org` (Organization)
- `markedBy` (User)

---

## Key Enums

### UserRole
- `SUPER_ADMIN`, `ADMIN`, `FOUNDATION`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`, `EDUCATOR`, `PARENT`

### OrganizationType
- `FOUNDATION`, `PRODUCT_SUPPLIER`, `SERVICE_PROVIDER`

### SubscriptionStatus
- `ACTIVE`, `INACTIVE`, `PAUSED`, `CANCELLED`, `EXPIRED`, `TRIAL`, `PAST_DUE`, `PENDING`, `GRACE_PERIOD`

### SubscriptionTier
- `BASIC`, `ESSENTIAL`, `PROFESSIONAL`, `ENTERPRISE`

### JobStatus
- `DRAFT`, `PUBLISHED`, `CLOSED`, `FILLED`

### ApplicationStatus
- `PENDING`, `REVIEWED`, `ACCEPTED`, `REJECTED`

### InquiryStatus
- `NEW`, `PENDING`, `CONTACTED`, `QUOTED`, `FULFILLED`, `DECLINED`, `CANCELLED`

### MessageType
- `TEXT`, `FILE`, `IMAGE`, `SYSTEM`

### ConversationType
- `DIRECT`, `GROUP`, `SUPPORT`

---

## Notes

- All primary keys are UUIDs (except some integer IDs for reference data)
- Timestamps use `createdAt` and `updatedAt` (auto-managed by Prisma)
- Soft deletes are not implemented (hard deletes)
- Foreign keys use `onDelete: Cascade` or `onDelete: SetNull` as appropriate
- JSON fields used for flexible data (metadata, settings, etc.)
- Arrays used for multi-value fields (tags, categories, etc.)
- Indexes added for frequently queried fields

