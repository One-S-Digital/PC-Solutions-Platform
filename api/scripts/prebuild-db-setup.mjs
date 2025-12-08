#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');

const log = (message) => console.log(message);
const warn = (message) => console.warn(message);

if (!process.env.DATABASE_URL) {
  log('⚠️  DATABASE_URL not set. Skipping database pre-build tasks.');
  process.exit(0);
}

const runPrisma = (args, { silent = false, allowFailure = false, input } = {}) => {
  const shouldPipe = silent || typeof input === 'string';
  const stdio = shouldPipe ? ['pipe', 'pipe', 'pipe'] : 'inherit';

  const result = spawnSync('npx', ['prisma', ...args], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio,
    encoding: 'utf8',
    input,
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  const stdoutTrimmed = stdout.trim();
  const stderrTrimmed = stderr.trim();
  const combinedOutput = [stdoutTrimmed, stderrTrimmed].filter(Boolean).join('\n');

  if (result.status !== 0) {
    if (allowFailure) {
      if (combinedOutput) {
        warn(combinedOutput);
      }
      return stdoutTrimmed || stderrTrimmed;
    }
    throw new Error(`prisma ${args.join(' ')} failed${combinedOutput ? `: ${combinedOutput}` : ''}`);
  }

  return stdoutTrimmed;
};

const parseJsonOutput = (raw) => {
  if (!raw) {
    return {};
  }

  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`Unable to parse JSON output:\n${trimmed}`);
  }

  return JSON.parse(trimmed.slice(jsonStart));
};

let cachedJsonStatusSupport;

const prismaMigrateStatusSupportsJson = () => {
  if (typeof cachedJsonStatusSupport === 'boolean') {
    return cachedJsonStatusSupport;
  }

  try {
    const helpOutput = runPrisma(
      ['migrate', 'status', '--help'],
      { silent: true },
    );
    cachedJsonStatusSupport = /\B--json\b/.test(helpOutput) || /--output(?:\s+|\=)json/.test(helpOutput);
  } catch (error) {
    cachedJsonStatusSupport = false;
    warn(`⚠️  Unable to determine Prisma CLI JSON support: ${error.message}`);
  }

  return cachedJsonStatusSupport;
};

const getFailedMigrations = () => {
  try {
    const supportsJson = prismaMigrateStatusSupportsJson();

    if (supportsJson) {
      // First try JSON format if supported
      const raw = runPrisma(
        ['migrate', 'status', '--schema', SCHEMA_PATH, '--json'],
        { silent: true, allowFailure: true },
      );
      if (raw) {
        try {
          const parsed = parseJsonOutput(raw);
          if (Array.isArray(parsed.failedMigrationNames) && parsed.failedMigrationNames.length > 0) {
            log(`📋 Detected failed migrations via JSON: ${parsed.failedMigrationNames.join(', ')}`);
            return parsed.failedMigrationNames;
          }
        } catch (parseError) {
          warn(`⚠️  Could not parse JSON status, trying text format...`);
        }
      }
    }
    
    // Fallback: try text format and parse it
    const textRaw = runPrisma(
      ['migrate', 'status', '--schema', SCHEMA_PATH],
      { silent: true, allowFailure: true },
    );
    
    if (textRaw) {
      const failedMigrations = [];
      const lines = textRaw.split('\n');
      
      for (const line of lines) {
        // Match patterns like "Following migration have failed:" followed by migration names
        // or "The `20251119100000_add_categories_array_fields` migration ... failed"
        if (line.includes('have failed:') || line.includes('Following migration')) {
          continue; // Header line
        }
        
        // Look for migration names (format: YYYYMMDDHHMMSS_name)
        const migrationMatch = line.match(/(\d{14}_[a-z_]+)/i);
        if (migrationMatch && (line.includes('failed') || line.toLowerCase().includes('failed'))) {
          failedMigrations.push(migrationMatch[1]);
        }
        
        // Also match the specific format in the error message
        if (line.includes('migration started at') && line.includes('failed')) {
          const nameMatch = line.match(/`([^`]+)`/);
          if (nameMatch) {
            failedMigrations.push(nameMatch[1]);
          }
        }
      }
      
      if (failedMigrations.length > 0) {
        const unique = [...new Set(failedMigrations)];
        log(`📋 Detected failed migrations via text parsing: ${unique.join(', ')}`);
        return unique;
      }
    }
    
    return [];
  } catch (error) {
    warn(`⚠️  Unable to detect failed migrations: ${error.message}`);
    return [];
  }
};

const resolveMigration = (action, migration) => {
  runPrisma(
    ['migrate', 'resolve', `--${action}`, migration, '--schema', SCHEMA_PATH],
    { silent: true, allowFailure: true },
  );
};

const ensureMetadataColumn = () => {
  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assets'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "assets"
        ADD COLUMN "metadata" JSONB;
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureCategoriesColumns = () => {
  const sql = `
DO $$
BEGIN
    -- Add categories column to products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "products" SET "categories" = ARRAY[category] 
        WHERE "category" IS NOT NULL AND "category" != '';
    END IF;

    -- Add categories column to services table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'categories'
    ) THEN
        ALTER TABLE "services" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "services" SET "categories" = ARRAY[category::text] 
        WHERE "category" IS NOT NULL;
    END IF;

    -- Add productCategories column to organizations table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'productCategories'
    ) THEN
        ALTER TABLE "organizations" ADD COLUMN "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Migrate existing data
        UPDATE "organizations" SET "productCategories" = ARRAY[productCategory] 
        WHERE "productCategory" IS NOT NULL AND "productCategory" != '';
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureProductMetadataColumns = () => {
  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ProductAvailabilityStatus'
    ) THEN
        CREATE TYPE "ProductAvailabilityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'OUT_OF_STOCK');
    END IF;
END
$$;

ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "subtitle" TEXT,
    ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'CHF',
    ADD COLUMN IF NOT EXISTS "primaryCategory" TEXT,
    ADD COLUMN IF NOT EXISTS "productHighlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT,
    ADD COLUMN IF NOT EXISTS "availabilityStatus" "ProductAvailabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS "sku" TEXT,
    ADD COLUMN IF NOT EXISTS "vendorSku" TEXT,
    ADD COLUMN IF NOT EXISTS "ean" TEXT,
    ADD COLUMN IF NOT EXISTS "minOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "maxOrderQuantity" INTEGER,
    ADD COLUMN IF NOT EXISTS "stockStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "deliveryLeadTimeDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "restockCadence" TEXT,
    ADD COLUMN IF NOT EXISTS "usageNotes" TEXT,
    ADD COLUMN IF NOT EXISTS "packagingDetails" TEXT,
    ADD COLUMN IF NOT EXISTS "materials" TEXT,
    ADD COLUMN IF NOT EXISTS "complianceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "ageRanges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "deliveryFees" JSONB,
    ADD COLUMN IF NOT EXISTS "supportedCantons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "visibilityStart" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "visibilityEnd" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "volumePricing" JSONB,
    ADD COLUMN IF NOT EXISTS "variants" JSONB,
    ADD COLUMN IF NOT EXISTS "galleryAssetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "specSheetAssetId" TEXT,
    ADD COLUMN IF NOT EXISTS "msdsAssetId" TEXT;

ALTER TABLE "products"
    ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "categories" SET DEFAULT ARRAY[]::TEXT[];
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureJobListingsTable = () => {
  const sql = `
-- Ensure JobStatus enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'JobStatus'
    ) THEN
        CREATE TYPE "public"."JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED');
    END IF;
END
$$;

-- Ensure JobContractType enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'JobContractType'
    ) THEN
        CREATE TYPE "public"."JobContractType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CDI', 'CDD', 'INTERNSHIP');
    END IF;
END
$$;

-- Create the job_listings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."job_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "salary" TEXT,
    "salaryRange" TEXT,
    "contractType" "public"."JobContractType" NOT NULL DEFAULT 'FULL_TIME',
    "startDate" TIMESTAMP(3),
    "status" "public"."JobStatus" NOT NULL DEFAULT 'DRAFT',
    "foundationId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- Create index on foundationId for organization-scoped queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_listings_foundationId_idx'
    ) THEN
        CREATE INDEX "job_listings_foundationId_idx" ON "public"."job_listings"("foundationId");
    END IF;
END $$;

-- Add foreign key for foundationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_listings_foundationId_fkey'
    ) THEN
        ALTER TABLE "public"."job_listings" 
        ADD CONSTRAINT "job_listings_foundationId_fkey" 
        FOREIGN KEY ("foundationId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureParentLeadsTable = () => {
  const sql = `
-- Create the parent_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."parent_leads" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "parentPhone" TEXT,
    "childName" TEXT NOT NULL,
    "childAge" INTEGER NOT NULL,
    "message" TEXT,
    "foundationId" TEXT,
    "preferredLocation" TEXT,
    "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialRequirements" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_leads_pkey" PRIMARY KEY ("id")
);

-- Create indexes on parent_leads (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'parent_leads_status_idx'
    ) THEN
        CREATE INDEX "parent_leads_status_idx" ON "public"."parent_leads"("status");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'parent_leads_foundationId_idx'
    ) THEN
        CREATE INDEX "parent_leads_foundationId_idx" ON "public"."parent_leads"("foundationId");
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureJobApplicationsTable = () => {
  const sql = `
-- Ensure ApplicationStatus enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus'
    ) THEN
        CREATE TYPE "public"."ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');
    END IF;
END
$$;

-- Create the job_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."job_applications" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "cvUrl" TEXT,
    "cvAssetId" TEXT,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- Create unique index (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_applications_jobListingId_candidateId_key'
    ) THEN
        CREATE UNIQUE INDEX "job_applications_jobListingId_candidateId_key" ON "public"."job_applications"("jobListingId", "candidateId");
    END IF;
END $$;

-- Create index on candidateId for user-scoped queries (e.g., fetching all applications for a user's profile)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_applications_candidateId_idx'
    ) THEN
        CREATE INDEX "job_applications_candidateId_idx" ON "public"."job_applications"("candidateId");
    END IF;
END $$;

-- Add foreign key for jobListingId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_applications_jobListingId_fkey'
    ) THEN
        ALTER TABLE "public"."job_applications" 
        ADD CONSTRAINT "job_applications_jobListingId_fkey" 
        FOREIGN KEY ("jobListingId") REFERENCES "public"."job_listings"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for candidateId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_applications_candidateId_fkey'
    ) THEN
        ALTER TABLE "public"."job_applications" 
        ADD CONSTRAINT "job_applications_candidateId_fkey" 
        FOREIGN KEY ("candidateId") REFERENCES "public"."users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureOrdersTable = () => {
  const sql = `
-- Create the orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Create index on organizationId for organization-scoped queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'orders_organizationId_idx'
    ) THEN
        CREATE INDEX "orders_organizationId_idx" ON "public"."orders"("organizationId");
    END IF;
END $$;

-- Add foreign key for organizationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."orders" 
        ADD CONSTRAINT "orders_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureOrderItemsTable = () => {
  const sql = `
-- Create the order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for orderId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_items_orderId_fkey'
    ) THEN
        ALTER TABLE "public"."order_items" 
        ADD CONSTRAINT "order_items_orderId_fkey" 
        FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for productId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_items_productId_fkey'
    ) THEN
        ALTER TABLE "public"."order_items" 
        ADD CONSTRAINT "order_items_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "public"."products"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureServiceRequestsTable = () => {
  const sql = `
-- Create the service_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- Create index on organizationId for organization-scoped queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'service_requests_organizationId_idx'
    ) THEN
        CREATE INDEX "service_requests_organizationId_idx" ON "public"."service_requests"("organizationId");
    END IF;
END $$;

-- Add foreign key for organizationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'service_requests_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."service_requests" 
        ADD CONSTRAINT "service_requests_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for serviceId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'service_requests_serviceId_fkey'
    ) THEN
        ALTER TABLE "public"."service_requests" 
        ADD CONSTRAINT "service_requests_serviceId_fkey" 
        FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureConversationsTable = () => {
  const sql = `
-- Ensure ConversationType enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ConversationType'
    ) THEN
        CREATE TYPE "public"."ConversationType" AS ENUM ('DIRECT', 'GROUP', 'SUPPORT');
    END IF;
END
$$;

-- Create the conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" TEXT NOT NULL,
    "type" "public"."ConversationType" NOT NULL DEFAULT 'DIRECT',
    "title" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureConversationParticipantsTable = () => {
  const sql = `
-- Create the conversation_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- Create unique index for conversationId + userId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'conversation_participants_conversationId_userId_key'
    ) THEN
        CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "public"."conversation_participants"("conversationId", "userId");
    END IF;
END $$;

-- Add foreign key for conversationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_participants_conversationId_fkey'
    ) THEN
        ALTER TABLE "public"."conversation_participants" 
        ADD CONSTRAINT "conversation_participants_conversationId_fkey" 
        FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for userId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_participants_userId_fkey'
    ) THEN
        ALTER TABLE "public"."conversation_participants" 
        ADD CONSTRAINT "conversation_participants_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureMessagesTable = () => {
  const sql = `
-- Ensure MessageType enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'MessageType'
    ) THEN
        CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'FILE', 'IMAGE', 'SYSTEM');
    END IF;
END
$$;

-- Create the messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "content" TEXT NOT NULL,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for conversationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_conversationId_fkey'
    ) THEN
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_conversationId_fkey" 
        FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for senderId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_senderId_fkey'
    ) THEN
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for receiverId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_receiverId_fkey'
    ) THEN
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_receiverId_fkey" 
        FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureOrganizationDocumentsTable = () => {
  const sql = `
-- Create the organization_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."organization_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CATALOG',
    "title" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id")
);

-- Create indexes for organization_documents (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'organization_documents_organizationId_idx'
    ) THEN
        CREATE INDEX "organization_documents_organizationId_idx" ON "public"."organization_documents"("organizationId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'organization_documents_documentType_idx'
    ) THEN
        CREATE INDEX "organization_documents_documentType_idx" ON "public"."organization_documents"("documentType");
    END IF;
END $$;

-- Add foreign key for organizationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organization_documents_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."organization_documents" 
        ADD CONSTRAINT "organization_documents_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for assetId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organization_documents_assetId_fkey'
    ) THEN
        ALTER TABLE "public"."organization_documents" 
        ADD CONSTRAINT "organization_documents_assetId_fkey" 
        FOREIGN KEY ("assetId") REFERENCES "public"."assets"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureInquiriesTable = () => {
  const sql = `
-- Ensure InquiryStatus enum exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'InquiryStatus'
    ) THEN
        CREATE TYPE "public"."InquiryStatus" AS ENUM ('NEW', 'PENDING', 'CONTACTED', 'QUOTED', 'FULFILLED', 'DECLINED', 'CANCELLED');
    END IF;
END
$$;

-- Create the inquiries table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "productInterest" TEXT,
    "quantity" INTEGER,
    "budget" TEXT,
    "urgency" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "preferredContactMethod" TEXT,
    "status" "public"."InquiryStatus" NOT NULL DEFAULT 'NEW',
    "supplierNotes" TEXT,
    "responseMessage" TEXT,
    "quotedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- Create indexes for inquiries (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_supplierId_status_idx'
    ) THEN
        CREATE INDEX "inquiries_supplierId_status_idx" ON "public"."inquiries"("supplierId", "status");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_organizationId_idx'
    ) THEN
        CREATE INDEX "inquiries_organizationId_idx" ON "public"."inquiries"("organizationId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'inquiries_createdAt_idx'
    ) THEN
        CREATE INDEX "inquiries_createdAt_idx" ON "public"."inquiries"("createdAt");
    END IF;
END $$;

-- Add foreign key for organizationId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inquiries_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."inquiries" 
        ADD CONSTRAINT "inquiries_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key for supplierId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inquiries_supplierId_fkey'
    ) THEN
        ALTER TABLE "public"."inquiries" 
        ADD CONSTRAINT "inquiries_supplierId_fkey" 
        FOREIGN KEY ("supplierId") REFERENCES "public"."organizations"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureFoundationPagesEnhancements = () => {
  // First ensure parent_leads exists (prerequisite)
  ensureParentLeadsTable();
  
  const sql = `
-- Create foundation_lead_responses table
CREATE TABLE IF NOT EXISTS "foundation_lead_responses" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "foundationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foundation_lead_responses_pkey" PRIMARY KEY ("id")
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- Create ticket_responses table
CREATE TABLE IF NOT EXISTS "ticket_responses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS "calendar_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- Create indexes for foundation_lead_responses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'foundation_lead_responses_leadId_foundationId_key') THEN
        CREATE UNIQUE INDEX "foundation_lead_responses_leadId_foundationId_key" ON "foundation_lead_responses"("leadId", "foundationId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'foundation_lead_responses_foundationId_idx') THEN
        CREATE INDEX "foundation_lead_responses_foundationId_idx" ON "foundation_lead_responses"("foundationId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'foundation_lead_responses_status_idx') THEN
        CREATE INDEX "foundation_lead_responses_status_idx" ON "foundation_lead_responses"("status");
    END IF;
END $$;

-- Create indexes for support_tickets
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_userId_idx') THEN
        CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_status_idx') THEN
        CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_priority_idx') THEN
        CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'support_tickets_assignedTo_idx') THEN
        CREATE INDEX "support_tickets_assignedTo_idx" ON "support_tickets"("assignedTo");
    END IF;
END $$;

-- Create indexes for ticket_responses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ticket_responses_ticketId_idx') THEN
        CREATE INDEX "ticket_responses_ticketId_idx" ON "ticket_responses"("ticketId");
    END IF;
END $$;

-- Create indexes for calendar_events
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'calendar_events_organizationId_idx') THEN
        CREATE INDEX "calendar_events_organizationId_idx" ON "calendar_events"("organizationId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'calendar_events_startTime_idx') THEN
        CREATE INDEX "calendar_events_startTime_idx" ON "calendar_events"("startTime");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'calendar_events_eventType_idx') THEN
        CREATE INDEX "calendar_events_eventType_idx" ON "calendar_events"("eventType");
    END IF;
END $$;

-- Add foreign keys for foundation_lead_responses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'foundation_lead_responses_leadId_fkey') THEN
        ALTER TABLE "foundation_lead_responses" ADD CONSTRAINT "foundation_lead_responses_leadId_fkey" 
        FOREIGN KEY ("leadId") REFERENCES "parent_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'foundation_lead_responses_foundationId_fkey') THEN
        ALTER TABLE "foundation_lead_responses" ADD CONSTRAINT "foundation_lead_responses_foundationId_fkey" 
        FOREIGN KEY ("foundationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign keys for support_tickets
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_userId_fkey') THEN
        ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_assignedTo_fkey') THEN
        ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedTo_fkey" 
        FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign keys for ticket_responses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_responses_ticketId_fkey') THEN
        ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_ticketId_fkey" 
        FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_responses_userId_fkey') THEN
        ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign keys for calendar_events
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_organizationId_fkey') THEN
        ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_createdBy_fkey') THEN
        ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const ensureTranslationInfrastructure = () => {
  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TranslationStatus'
    ) THEN
        CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
    ) THEN
        CREATE TABLE "entity_translations" (
            "entityType" TEXT NOT NULL,
            "entityId" TEXT NOT NULL,
            "lang" TEXT NOT NULL,
            "field" TEXT NOT NULL,
            "text" TEXT NOT NULL,
            "origin" TEXT NOT NULL DEFAULT 'machine',
            "verified" BOOLEAN NOT NULL DEFAULT false,
            "sourceHash" TEXT NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "approvedAt" TIMESTAMP(3),
            "approvedBy" TEXT,
            "mtProvider" TEXT,
            "reviewedAt" TIMESTAMP(3),
            "reviewedBy" TEXT,
            "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
            "translatedAt" TIMESTAMP(3),
            CONSTRAINT "entity_translations_pkey" PRIMARY KEY ("entityType","entityId","lang","field")
        );
    END IF;
END
$$;

ALTER TABLE "entity_translations"
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "mtProvider" TEXT,
    ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "translatedAt" TIMESTAMP(3);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'entity_translations'
          AND column_name = 'updatedAt'
          AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE "entity_translations"
        ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END
$$;
`;

  runPrisma(
    ['db', 'execute', '--schema', SCHEMA_PATH, '--stdin'],
    { silent: true, input: sql },
  );
};

const handleFailedMigration = (migration) => {
  switch (migration) {
    case '20251104140358_add_asset_metadata_field':
      log(`   • Resolving ${migration} (metadata column)`);
      ensureMetadataColumn();
      resolveMigration('applied', migration);
      break;
    // case '20251114140526_add_i18n_translation_tables':
    //   log(`   • Resolving ${migration} (translation infrastructure)`);
    //   ensureTranslationInfrastructure();
    //   resolveMigration('applied', migration);
    //   break;
    case '20251119100000_add_categories_array_fields':
      log(`   • Resolving ${migration} (categories columns)`);
      ensureCategoriesColumns();
      resolveMigration('applied', migration);
      break;
    case '20251120120000_expand_product_metadata':
      log(`   • Resolving ${migration} (product metadata columns)`);
      ensureProductMetadataColumns();
      resolveMigration('applied', migration);
      break;
    case '20251202_foundation_pages_enhancements':
      log(`   • Resolving ${migration} (foundation pages enhancements)`);
      ensureFoundationPagesEnhancements();
      resolveMigration('applied', migration);
      break;
    case '20251208000000_add_inquiries_table':
      log(`   • Resolving ${migration} (inquiries table)`);
      ensureInquiriesTable();
      resolveMigration('applied', migration);
      break;
    default:
      log(`   • Rolling back failed migration ${migration}`);
      resolveMigration('rolled-back', migration);
      break;
  }
};

log('🔧 Running database pre-build cleanup...');
log(`📍 Database URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
log(`📍 Schema path: ${SCHEMA_PATH}`);

// Ensure critical recruitment tables exist before migrations run
log('🔁 Ensuring job_listings table exists...');
try {
  ensureJobListingsTable();
  log('✅ job_listings table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure job_listings table: ${error.message}`);
}

log('🔁 Ensuring job_applications table exists...');
try {
  ensureJobApplicationsTable();
  log('✅ job_applications table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure job_applications table: ${error.message}`);
}

log('🔁 Ensuring parent_leads table exists...');
try {
  ensureParentLeadsTable();
  log('✅ parent_leads table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure parent_leads table: ${error.message}`);
}

log('🔁 Ensuring organization_documents table exists...');
try {
  ensureOrganizationDocumentsTable();
  log('✅ organization_documents table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure organization_documents table: ${error.message}`);
}

log('🔁 Ensuring orders table exists...');
try {
  ensureOrdersTable();
  log('✅ orders table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure orders table: ${error.message}`);
}

log('🔁 Ensuring order_items table exists...');
try {
  ensureOrderItemsTable();
  log('✅ order_items table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure order_items table: ${error.message}`);
}

log('🔁 Ensuring service_requests table exists...');
try {
  ensureServiceRequestsTable();
  log('✅ service_requests table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure service_requests table: ${error.message}`);
}

log('🔁 Ensuring conversations table exists...');
try {
  ensureConversationsTable();
  log('✅ conversations table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure conversations table: ${error.message}`);
}

log('🔁 Ensuring conversation_participants table exists...');
try {
  ensureConversationParticipantsTable();
  log('✅ conversation_participants table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure conversation_participants table: ${error.message}`);
}

log('🔁 Ensuring messages table exists...');
try {
  ensureMessagesTable();
  log('✅ messages table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure messages table: ${error.message}`);
}

log('🔁 Ensuring inquiries table exists...');
try {
  ensureInquiriesTable();
  log('✅ inquiries table check complete');
} catch (error) {
  warn(`⚠️  Could not ensure inquiries table: ${error.message}`);
}

// log('🔁 Ensuring translation infrastructure is present...');
// ensureTranslationInfrastructure();

const failedMigrations = getFailedMigrations();
const forcedMigrationsEnv = process.env.FORCE_RESOLVE_MIGRATIONS || '';
const forcedMigrations = forcedMigrationsEnv
  .split(',')
  .map((migration) => migration.trim())
  .filter(Boolean);
const forcedOnly = forcedMigrations.filter((migration) => !failedMigrations.includes(migration));
const migrationsToProcess = [...new Set([...failedMigrations, ...forcedMigrations])];

if (migrationsToProcess.length === 0) {
  log('✅ No failed migrations detected.');
} else {
  if (failedMigrations.length > 0) {
    log(`❗ Detected ${failedMigrations.length} failed migration(s). Attempting automatic cleanup...`);
  }
  if (forcedOnly.length > 0) {
    log(`⚙️  Force-resolving migration(s): ${forcedOnly.join(', ')}`);
  }
  migrationsToProcess.forEach((migration) => {
    log(`   🔄 Processing: ${migration}`);
    handleFailedMigration(migration);
  });
  log('✅ Failed migrations processed.');
}

log('✅ Database pre-build cleanup complete.');
