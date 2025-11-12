# Unified i18n Implementation Plan (Enhanced)
## Static UI (Database-Backed) + Dynamic Content (MT Pipeline)

**Objective**: Zero-redeploy i18n system with unified database-backed architecture for both static UI and dynamic content translations, with production-ready features: cache versioning, translation memory, cost guardrails, and governance.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Admin UI Implementation](#admin-ui-implementation)
6. [Dynamic Content MT Pipeline](#dynamic-content-mt-pipeline)
7. [Translation Memory & Cost Guardrails](#translation-memory--cost-guardrails)
8. [Security & Compliance](#security--compliance)
9. [Admin Governance](#admin-governance)
10. [Migration Strategy](#migration-strategy)
11. [Deployment Plan](#deployment-plan)
12. [Testing Strategy](#testing-strategy)
13. [Monitoring & Observability](#monitoring--observability)

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    STATIC UI TRANSLATIONS                    │
│  (Buttons, Labels, Messages, Form Text)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ StaticTranslation Table │  ← Database (Postgres)
              │ (namespace, key, lang)  │     Managed via Admin UI
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ /api/static-translations│  ← REST API
              │ /:lang/:namespace       │     Runtime loading
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ i18next-http-backend    │  ← Frontend/Admin
              │ (Runtime Loading)       │     Zero redeploy
              └─────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                 DYNAMIC USER CONTENT                        │
│  (Profiles, Articles, Products, Job Posts)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ EntityTranslation Table │  ← Database (Postgres)
              │ (entityType, entityId,  │     Auto-translated
              │  lang, field)           │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ BullMQ Translation Queue│  ← Async Processing
              │ (Redis-backed)          │     Non-blocking
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ DeepL API               │  ← Machine Translation
              │ (External Service)      │     Auto-translates
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Write back to DB        │  ← Background Worker
              │ EntityTranslation       │     Updates available
              └─────────────────────────┘
```

### Key Principles

1. **Unified Database**: Both static and dynamic translations in Postgres
2. **Zero Redeploy**: Runtime loading for static, async processing for dynamic
3. **Single Admin UI**: Manage all translations in one place
4. **Performance**: Caching at multiple layers (Redis, IndexedDB, HTTP cache)
5. **Future-proof**: Extensible schema, type-safe, observable

---

## 🗄️ Database Schema

### 1. Static Translation Table

```prisma
// Add to api/prisma/schema.prisma

model StaticTranslation {
  namespace String   // 'common', 'auth', 'dashboard', etc.
  key       String   // 'buttons.submit', 'errors.required', etc.
  lang      String   // 'en', 'fr', 'de'
  value     String   @db.Text // The translated text
  updatedAt DateTime @updatedAt
  updatedBy String?  // User ID (from Clerk) who last updated
  createdAt DateTime @default(now())
  
  // Optional: Track if translation needs review
  needsReview Boolean @default(false)
  reviewedBy  String?
  reviewedAt  DateTime?
  
  @@id([namespace, key, lang])
  @@index([namespace, lang])
  @@index([key])
  @@map("static_translations")
}
```

### 2. Enhanced Entity Translation (with lifecycle states)

```prisma
// Enhanced with explicit lifecycle states
enum TranslationStatus {
  PENDING      // Queued for translation
  MT_DONE      // Machine translation completed
  REVIEWED     // Human reviewed but not approved
  APPROVED     // Approved for production use
}

model EntityTranslation {
  entityType String
  entityId   String
  lang       String
  field      String
  text       String   @db.Text
  origin     String   @default("machine") // 'machine' | 'human'
  status     TranslationStatus @default(PENDING)
  verified   Boolean  @default(false)
  sourceHash String
  updatedAt  DateTime @default(now())
  translatedAt DateTime?
  mtProvider    String?  // 'deepl' | 'google' | 'manual'
  // Approval tracking
  approvedAt    DateTime?
  approvedBy    String?  // User ID
  reviewedAt    DateTime?
  reviewedBy    String?  // User ID
  
  @@id([entityType, entityId, lang, field])
  @@index([entityType, lang])
  @@index([status, updatedAt])
  @@map("entity_translations")
}
```

### 3. Translation Memory (TM) Table

```prisma
// Translation Memory: Cache MT results to avoid re-translating
model TranslationMemory {
  id            String   @id @default(cuid())
  sourceTextHash String   // SHA256 of source text
  sourceLang    String
  targetLang    String
  translatedText String  @db.Text
  mtProvider    String   // 'deepl' | 'google'
  usageCount    Int      @default(1) // Track how often this TM is used
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime @updatedAt
  
  @@unique([sourceTextHash, sourceLang, targetLang])
  @@index([sourceLang, targetLang])
  @@map("translation_memory")
}
```

### 4. Translation Release Versioning

```prisma
// Track translation releases for cache-busting
model TranslationRelease {
  id          String   @id @default(cuid())
  version     String   @unique // e.g., "v1.2.3" or timestamp-based
  description String?
  createdBy   String?  // User ID
  createdAt   DateTime @default(now())
  isActive    Boolean  @default(false) // Only one active at a time
  
  @@index([isActive, createdAt])
  @@map("translation_releases")
}
```

### 5. Translation Audit Log

```prisma
// Audit log for translation changes
model TranslationAuditLog {
  id            String   @id @default(cuid())
  type          String   // 'static' | 'dynamic'
  namespace     String?  // For static translations
  entityType    String?  // For dynamic translations
  entityId      String?
  key           String?  // Translation key
  field         String?  // For dynamic translations
  lang          String
  action        String   // 'create' | 'update' | 'delete' | 'approve' | 'review'
  oldValue      String?  @db.Text
  newValue      String?  @db.Text
  userId        String
  createdAt     DateTime @default(now())
  
  @@index([type, createdAt])
  @@index([userId, createdAt])
  @@map("translation_audit_logs")
}
```

### 6. MT Cost Tracking

```prisma
// Track MT API usage and costs
model MTCostTracking {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  provider      String   // 'deepl' | 'google'
  sourceLang    String
  targetLang    String
  characters    Int      // Characters translated
  cost          Decimal  @db.Decimal(10, 4) // Cost in CHF
  jobCount      Int      @default(0)
  
  @@unique([date, provider, sourceLang, targetLang])
  @@index([date, provider])
  @@map("mt_cost_tracking")
}
```

### Migration File

```sql
-- api/prisma/migrations/XXXXXX_add_i18n_enhancements/migration.sql

-- Create TranslationStatus enum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'MT_DONE', 'REVIEWED', 'APPROVED');

-- Create static_translations table
CREATE TABLE "static_translations" (
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "static_translations_pkey" PRIMARY KEY ("namespace", "key", "lang")
);

-- Create indexes
CREATE INDEX "static_translations_namespace_lang_idx" ON "static_translations"("namespace", "lang");
CREATE INDEX "static_translations_key_idx" ON "static_translations"("key");

-- Update entity_translations table (add new columns)
ALTER TABLE "entity_translations" 
  ADD COLUMN IF NOT EXISTS "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "translatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mtProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

CREATE INDEX IF NOT EXISTS "entity_translations_status_updatedAt_idx" 
  ON "entity_translations"("status", "updatedAt");

-- Create translation_memory table
CREATE TABLE "translation_memory" (
    "id" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "mtProvider" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_memory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "translation_memory_sourceTextHash_sourceLang_targetLang_key" 
      UNIQUE ("sourceTextHash", "sourceLang", "targetLang")
);

CREATE INDEX "translation_memory_sourceLang_targetLang_idx" 
  ON "translation_memory"("sourceLang", "targetLang");

-- Create translation_releases table
CREATE TABLE "translation_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "translation_releases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "translation_releases_version_key" UNIQUE ("version")
);

CREATE INDEX "translation_releases_isActive_createdAt_idx" 
  ON "translation_releases"("isActive", "createdAt");

-- Create translation_audit_logs table
CREATE TABLE "translation_audit_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "namespace" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "key" TEXT,
    "field" TEXT,
    "lang" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "translation_audit_logs_type_createdAt_idx" 
  ON "translation_audit_logs"("type", "createdAt");
CREATE INDEX "translation_audit_logs_userId_createdAt_idx" 
  ON "translation_audit_logs"("userId", "createdAt");

-- Create mt_cost_tracking table
CREATE TABLE "mt_cost_tracking" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "characters" INTEGER NOT NULL,
    "cost" DECIMAL(10, 4) NOT NULL,
    "jobCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mt_cost_tracking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mt_cost_tracking_date_provider_sourceLang_targetLang_key" 
      UNIQUE ("date", "provider", "sourceLang", "targetLang")
);

CREATE INDEX "mt_cost_tracking_date_provider_idx" 
  ON "mt_cost_tracking"("date", "provider");
```

---

## 🔧 Backend Implementation

### 1. Static Translation Service

```typescript
// api/src/static-translation/static-translation.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

export interface StaticTranslationDto {
  namespace: string;
  key: string;
  lang: string;
  value: string;
}

@Injectable()
export class StaticTranslationService {
  private readonly logger = new Logger(StaticTranslationService.name);
  private readonly CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get all translations for a namespace and language
   * Used by frontend for runtime loading
   * Returns data and ETag for cache validation
   */
  async getByNamespace(
    lang: string,
    namespace: string,
  ): Promise<{ data: Record<string, any>; etag: string }> {
    const cacheKey = `static:${lang}:${namespace}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<{ data: Record<string, any>; etag: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const translations = await this.prisma.staticTranslation.findMany({
      where: {
        lang,
        namespace,
      },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform flat keys to nested object structure
    const result = this.nestKeys(translations);

    // Generate ETag from content hash (use latest updatedAt + count as version)
    const latestUpdate = translations[0]?.updatedAt || new Date();
    const etag = this.generateETag(result, latestUpdate);

    const response = { data: result, etag };

    // Cache result with ETag
    await this.cacheManager.set(cacheKey, response, this.CACHE_TTL * 1000);

    return response;
  }

  /**
   * Generate ETag from translation data
   */
  private generateETag(data: Record<string, any>, updatedAt: Date): string {
    const crypto = require('crypto');
    const content = JSON.stringify(data);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const timestamp = updatedAt.getTime();
    return `"${hash}-${timestamp}"`;
  }

  /**
   * Get all namespaces for a language
   */
  async getAllNamespaces(lang: string): Promise<string[]> {
    const result = await this.prisma.staticTranslation.findMany({
      where: { lang },
      select: { namespace: true },
      distinct: ['namespace'],
    });
    return result.map(r => r.namespace);
  }

  /**
   * List all translation keys (for admin UI)
   */
  async listKeys(namespace?: string, lang?: string) {
    const where: any = {};
    if (namespace) where.namespace = namespace;
    if (lang) where.lang = lang;

    const translations = await this.prisma.staticTranslation.findMany({
      where,
      orderBy: [
        { namespace: 'asc' },
        { key: 'asc' },
        { lang: 'asc' },
      ],
    });

    // Group by namespace and key
    const grouped = translations.reduce((acc, t) => {
      const groupKey = `${t.namespace}:${t.key}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          namespace: t.namespace,
          key: t.key,
          translations: {},
        };
      }
      acc[groupKey].translations[t.lang] = {
        value: t.value,
        updatedAt: t.updatedAt,
        updatedBy: t.updatedBy,
        needsReview: t.needsReview,
      };
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  /**
   * Get single translation
   */
  async getTranslation(namespace: string, key: string, lang: string): Promise<StaticTranslationDto | null> {
    return this.prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });
  }

  /**
   * Create or update translation
   */
  async upsertTranslation(
    namespace: string,
    key: string,
    lang: string,
    value: string,
    updatedBy?: string,
  ): Promise<StaticTranslationDto> {
    // Get old value for audit log
    const oldTranslation = await this.prisma.staticTranslation.findUnique({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });

    const translation = await this.prisma.staticTranslation.upsert({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
      update: {
        value,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        namespace,
        key,
        lang,
        value,
        updatedBy,
      },
    });

    // Log audit trail
    await this.logAudit({
      type: 'static',
      namespace,
      key,
      lang,
      action: oldTranslation ? 'update' : 'create',
      oldValue: oldTranslation?.value,
      newValue: value,
      userId: updatedBy || 'system',
    });

    // Invalidate cache
    await this.invalidateCache(lang, namespace);

    this.logger.log(`Updated static translation: ${namespace}:${key} (${lang})`);
    return translation;
  }

  /**
   * Log translation changes to audit log
   */
  private async logAudit(log: {
    type: 'static' | 'dynamic';
    namespace?: string;
    entityType?: string;
    entityId?: string;
    key?: string;
    field?: string;
    lang: string;
    action: string;
    oldValue?: string;
    newValue?: string;
    userId: string;
  }): Promise<void> {
    try {
      await this.prisma.translationAuditLog.create({
        data: log,
      });
    } catch (error) {
      this.logger.error('Failed to log audit trail', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }

  /**
   * Bulk upsert translations
   */
  async bulkUpsert(
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
    updatedBy?: string,
  ): Promise<number> {
    const operations = translations.map(t =>
      this.prisma.staticTranslation.upsert({
        where: {
          namespace_key_lang: {
            namespace: t.namespace,
            key: t.key,
            lang: t.lang,
          },
        },
        update: {
          value: t.value,
          updatedBy,
          updatedAt: new Date(),
        },
        create: {
          namespace: t.namespace,
          key: t.key,
          lang: t.lang,
          value: t.value,
          updatedBy,
        },
      })
    );

    await Promise.all(operations);

    // Invalidate all affected caches
    const affectedNamespaces = new Set(translations.map(t => `${t.lang}:${t.namespace}`));
    await Promise.all(
      Array.from(affectedNamespaces).map(key => {
        const [lang, namespace] = key.split(':');
        return this.invalidateCache(lang, namespace);
      })
    );

    return translations.length;
  }

  /**
   * Delete translation
   */
  async deleteTranslation(namespace: string, key: string, lang: string): Promise<void> {
    await this.prisma.staticTranslation.delete({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
    });

    await this.invalidateCache(lang, namespace);
  }

  /**
   * Mark translation as reviewed
   */
  async markReviewed(namespace: string, key: string, lang: string, reviewedBy: string): Promise<void> {
    await this.prisma.staticTranslation.update({
      where: {
        namespace_key_lang: {
          namespace,
          key,
          lang,
        },
      },
      data: {
        needsReview: false,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    await this.invalidateCache(lang, namespace);
  }

  /**
   * Helper: Transform flat keys to nested object
   */
  private nestKeys(translations: Array<{ key: string; value: string }>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const { key, value } of translations) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  /**
   * Get current translation version for cache-busting
   */
  async getCurrentVersion(): Promise<string> {
    const activeRelease = await this.prisma.translationRelease.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeRelease) {
      return activeRelease.version;
    }

    // Fallback to timestamp-based version if no release exists
    return `v${Date.now()}`;
  }

  /**
   * Create a new translation release
   */
  async createRelease(version: string, description: string, createdBy: string): Promise<void> {
    // Deactivate all existing releases
    await this.prisma.translationRelease.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new release
    await this.prisma.translationRelease.create({
      data: {
        version,
        description,
        createdBy,
        isActive: true,
      },
    });

    // Invalidate all caches to force refresh
    // This is a simple approach - in production, you might want to track all cache keys
    this.logger.log(`Created translation release: ${version}`);
  }

  /**
   * Invalidate cache for a namespace
   */
  private async invalidateCache(lang: string, namespace: string): Promise<void> {
    const cacheKey = `static:${lang}:${namespace}`;
    await this.cacheManager.del(cacheKey);
  }
}
```

### 2. Static Translation Controller

```typescript
// api/src/static-translation/static-translation.controller.ts

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { StaticTranslationService } from './static-translation.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Static Translations')
@Controller('static-translations')
export class StaticTranslationController {
  constructor(private readonly service: StaticTranslationService) {}

  /**
   * Public endpoint: Get translations for a namespace
   * Used by i18next-http-backend for runtime loading
   * Includes ETag and Cache-Control headers for efficient caching
   */
  @Get(':lang/:namespace')
  @Throttle(100, 60) // Rate limit: 100 requests per minute
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Get static translations (public)' })
  @ApiResponse({ status: 200, description: 'Translations retrieved' })
  @ApiResponse({ status: 304, description: 'Not modified (ETag match)' })
  async getTranslations(
    @Param('lang') lang: string,
    @Param('namespace') namespace: string,
    @Query('v') version?: string, // Optional version query param
    @Headers('if-none-match') ifNoneMatch?: string,
    @Res() res: Response,
  ): Promise<void> {
    const { data, etag } = await this.service.getByNamespace(lang, namespace);

    // Check if client has cached version
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    // Set ETag header
    res.setHeader('ETag', etag);
    res.json(data);
  }

  /**
   * Get current translation version for cache-busting
   */
  @Get('system/version')
  @ApiOperation({ summary: 'Get current translation version' })
  async getVersion(): Promise<{ version: string }> {
    const version = await this.service.getCurrentVersion();
    return { version };
  }

  /**
   * Admin: List all translation keys
   */
  @Get('admin/keys')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all translation keys (admin)' })
  async listKeys(
    @Query('namespace') namespace?: string,
    @Query('lang') lang?: string,
  ) {
    return this.service.listKeys(namespace, lang);
  }

  /**
   * Admin: Get single translation
   */
  @Get('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single translation (admin)' })
  async getTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
  ) {
    return this.service.getTranslation(namespace, key, lang);
  }

  /**
   * Admin: Create or update translation
   */
  @Put('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update translation (admin)' })
  async updateTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
    @Body('value') value: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.service.upsertTranslation(namespace, key, lang, value, userId);
  }

  /**
   * Admin: Bulk update translations
   */
  @Post('admin/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update translations (admin)' })
  async bulkUpdate(
    @Body() translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const count = await this.service.bulkUpsert(translations, userId);
    return { updated: count };
  }

  /**
   * Admin: Delete translation
   */
  @Delete('admin/:namespace/:key/:lang')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete translation (admin)' })
  async deleteTranslation(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
  ) {
    await this.service.deleteTranslation(namespace, key, lang);
    return { success: true };
  }

  /**
   * Admin: Mark as reviewed
   */
  @Post('admin/:namespace/:key/:lang/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark translation as reviewed (admin)' })
  async markReviewed(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Param('lang') lang: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    await this.service.markReviewed(namespace, key, lang, userId);
    return { success: true };
  }

  /**
   * Admin: Get all namespaces
   */
  @Get('admin/namespaces')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all namespaces (admin)' })
  async getNamespaces(@Query('lang') lang?: string) {
    if (lang) {
      return this.service.getAllNamespaces(lang);
    }
    // Return all unique namespaces
    const result = await this.service.listKeys();
    const namespaces = new Set(result.map((r: any) => r.namespace));
    return Array.from(namespaces);
  }
}
```

### 3. Static Translation Module

```typescript
// api/src/static-translation/static-translation.module.ts

import { Module } from '@nestjs/common';
import { StaticTranslationController } from './static-translation.controller';
import { StaticTranslationService } from './static-translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      ttl: 15 * 60, // 15 minutes
    }),
  ],
  controllers: [StaticTranslationController],
  providers: [StaticTranslationService],
  exports: [StaticTranslationService],
})
export class StaticTranslationModule {}
```

---

## 🎨 Frontend Implementation

### 1. i18next Configuration with Runtime Loading

```typescript
// frontend/src/i18n/config.ts

import i18n from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { IndexedDBBackend } from './indexeddb-backend';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

i18n
  .use(IndexedDBBackend) // Custom: IndexedDB cache layer
  .use(HttpBackend)
  .use(ICU)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'fr', // Default to French for Swiss market
    fallbackLng: {
      'fr-CH': ['fr', 'en'],
      'de-CH': ['de', 'en'],
      'default': ['en'],
    },
    supportedLngs: ['en', 'fr', 'de'],
    ns: [
      'common', 'auth', 'dashboard', 'settings', 'billing',
      'elearning', 'supplier', 'hr', 'emails', 'marketplace',
      'recruitment', 'users', 'content', 'messages', 'admin',
      'profile', 'signup', 'pricing', 'parentLeadForm',
    ],
    defaultNS: 'common',
    backend: {
      // Version will be fetched and appended dynamically
      loadPath: async (lngs, namespaces) => {
        // Fetch current translation version
        const versionResponse = await fetch(`${API_URL}/static-translations/system/version`);
        const { version } = await versionResponse.json();
        return `${API_URL}/static-translations/${lngs[0]}/${namespaces[0]}?v=${version}`;
      },
      // Custom load function with error handling and caching
      load: async (lngs, namespaces, callback) => {
        const [lng, ns] = [lngs[0], namespaces[0]];
        
        try {
          // Try IndexedDB cache first
          const cached = await IndexedDBBackend.read(lng, ns);
          if (cached && !isStale(cached)) {
            callback(null, { status: 200, data: cached.data });
            return;
          }

          // Fetch from API
          const response = await fetch(`${API_URL}/static-translations/${lng}/${ns}`, {
            headers: {
              'Accept': 'application/json',
            },
            cache: 'force-cache', // Use browser cache
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const etag = response.headers.get('ETag');

          // Cache in IndexedDB
          await IndexedDBBackend.save(lng, ns, data, etag);

          callback(null, { status: 200, data });
        } catch (error) {
          console.warn(`Failed to load translation ${lng}/${ns}:`, error);
          
          // Fallback to bundled translations (if available)
          try {
            const bundled = await importFallback(lng, ns);
            callback(null, { status: 200, data: bundled });
          } catch (fallbackError) {
            callback(fallbackError, { status: 500, data: {} });
          }
        }
      },
    },
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        // ICU formatting for dates, numbers, currency
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'CHF',
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value));
        }
        return value;
      },
    },
    react: {
      useSuspense: true,
    },
    // Performance optimizations
    updateMissing: false,
    saveMissing: false, // Disabled in production - use admin UI instead
    cache: {
      enabled: true,
    },
  });

// Preload critical namespaces on app init
export const preloadCriticalNamespaces = async () => {
  const critical = ['common', 'auth', 'dashboard'];
  await Promise.all(
    critical.map(ns => i18n.loadNamespaces(ns))
  );
};

// Fallback to bundled translations (optional, for offline support)
async function importFallback(lng: string, ns: string): Promise<any> {
  try {
    // Try to import from packages/translations as fallback
    const module = await import(`@workspace/translations/locales/${lng}/${ns}.json`);
    return module.default || module;
  } catch {
    return {};
  }
}

function isStale(cached: { timestamp: number }): boolean {
  const MAX_AGE = 60 * 60 * 1000; // 1 hour
  return Date.now() - cached.timestamp > MAX_AGE;
}

export default i18n;
```

### 2. IndexedDB Cache Layer

```typescript
// frontend/src/i18n/indexeddb-backend.ts

export class IndexedDBBackend {
  private static dbName = 'i18n-cache';
  private static storeName = 'translations';
  private static db: IDBDatabase | null = null;

  static async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: ['lng', 'ns'] });
        }
      };
    });
  }

  static async read(
    lng: string,
    ns: string
  ): Promise<{ data: any; etag: string; timestamp: number } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get([lng, ns]);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async save(
    lng: string,
    ns: string,
    data: any,
    etag: string | null
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      store.put({
        lng,
        ns,
        data,
        etag: etag || '',
        timestamp: Date.now(),
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  static async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 3. App Initialization

```typescript
// frontend/src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { preloadCriticalNamespaces } from './i18n/config';

// Preload translations before rendering
preloadCriticalNamespaces()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error('Failed to initialize i18n:', error);
    // Still render app with fallback
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
```

---

## 🎛️ Admin UI Implementation

### 1. Translation Management Page

```typescript
// admin/src/pages/Translations.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';

interface TranslationKey {
  namespace: string;
  key: string;
  translations: {
    [lang: string]: {
      value: string;
      updatedAt: string;
      updatedBy?: string;
      needsReview: boolean;
    };
  };
}

export default function Translations() {
  const { t } = useTranslation(['admin', 'common']);
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<TranslationKey[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<{
    namespace: string;
    key: string;
    lang: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadNamespaces();
    loadKeys();
  }, [selectedNamespace]);

  const loadNamespaces = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/static-translations/admin/namespaces`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setNamespaces(data);
    } catch (error) {
      console.error('Failed to load namespaces:', error);
    }
  };

  const loadKeys = async () => {
    try {
      const token = await getToken();
      const url = new URL(`${API_URL}/static-translations/admin/keys`);
      if (selectedNamespace) {
        url.searchParams.set('namespace', selectedNamespace);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setKeys(data);
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  };

  const startEdit = (namespace: string, key: string, lang: string, currentValue: string) => {
    setEditing({ namespace, key, lang });
    setEditValue(currentValue);
  };

  const saveTranslation = async () => {
    if (!editing) return;

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/static-translations/admin/${editing.namespace}/${editing.key}/${editing.lang}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value: editValue }),
        }
      );

      if (response.ok) {
        await loadKeys();
        setEditing(null);
        setEditValue('');
      }
    } catch (error) {
      console.error('Failed to save translation:', error);
    }
  };

  const filteredKeys = keys.filter((k) => {
    if (searchQuery) {
      return (
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(k.translations).some((t) =>
          t.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    return true;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('admin:translations.title')}</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search keys or values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
      </div>

      {/* Translation Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Namespace</th>
              <th className="border p-2 text-left">Key</th>
              <th className="border p-2 text-left">English</th>
              <th className="border p-2 text-left">French</th>
              <th className="border p-2 text-left">German</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((item) => (
              <tr key={`${item.namespace}:${item.key}`}>
                <td className="border p-2">{item.namespace}</td>
                <td className="border p-2 font-mono text-sm">{item.key}</td>
                {['en', 'fr', 'de'].map((lang) => {
                  const translation = item.translations[lang];
                  const isEditing =
                    editing?.namespace === item.namespace &&
                    editing?.key === item.key &&
                    editing?.lang === lang;

                  return (
                    <td key={lang} className="border p-2">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="border rounded px-2 py-1 flex-1"
                            rows={2}
                          />
                          <button
                            onClick={saveTranslation}
                            className="bg-blue-500 text-white px-3 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="bg-gray-500 text-white px-3 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className={translation?.needsReview ? 'text-orange-600' : ''}>
                            {translation?.value || (
                              <span className="text-gray-400 italic">Missing</span>
                            )}
                          </div>
                          {translation?.updatedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(translation.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                          <button
                            onClick={() =>
                              startEdit(
                                item.namespace,
                                item.key,
                                lang,
                                translation?.value || ''
                              )
                            }
                            className="text-blue-600 text-xs mt-1"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 2. Add to Admin Routes

```typescript
// admin/src/App.tsx or router config

import Translations from './pages/Translations';

// Add route:
<Route path="/translations" element={<Translations />} />
```

---

## 🔄 Dynamic Content MT Pipeline

### 1. Install Dependencies

```bash
cd api
pnpm add @nestjs/bull bull redis deepl-node
pnpm add -D @types/bull
```

### 2. DeepL Service

```typescript
// api/src/translation/deepl.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as deepl from 'deepl-node';

@Injectable()
export class DeepLService {
  private readonly logger = new Logger(DeepLService.name);
  private translator: deepl.Translator | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPL_API_KEY');
    if (apiKey) {
      this.translator = new deepl.Translator(apiKey);
    } else {
      this.logger.warn('DeepL API key not configured');
    }
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    if (!this.translator) {
      throw new Error('DeepL translator not initialized');
    }

    try {
      // Map our language codes to DeepL codes
      const sourceLangCode = this.mapToDeepLCode(sourceLang);
      const targetLangCode = this.mapToDeepLCode(targetLang);

      if (!sourceLangCode || !targetLangCode) {
        throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
      }

      const result = await this.translator.translateText(
        text,
        sourceLangCode,
        targetLangCode,
      );

      return result.text;
    } catch (error) {
      this.logger.error(`DeepL translation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async translateBatch(
    texts: string[],
    sourceLang: string,
    targetLang: string,
  ): Promise<string[]> {
    if (!this.translator) {
      throw new Error('DeepL translator not initialized');
    }

    try {
      const sourceLangCode = this.mapToDeepLCode(sourceLang);
      const targetLangCode = this.mapToDeepLCode(targetLang);

      if (!sourceLangCode || !targetLangCode) {
        throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
      }

      const results = await this.translator.translateText(
        texts,
        sourceLangCode,
        targetLangCode,
      );

      return results.map((r) => r.text);
    } catch (error) {
      this.logger.error(`DeepL batch translation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map our language codes to DeepL codes
   * Using EN-GB for English (Swiss context, British English is more appropriate)
   * Can be changed to EN-US if preferred
   */
  private mapToDeepLCode(lang: string): string | null {
    const mapping: Record<string, string> = {
      en: 'EN-GB', // British English (or 'EN-US' for American English)
      fr: 'FR',
      de: 'DE',
    };
    return mapping[lang] || null;
  }

  /**
   * Normalize language code (handle variants)
   */
  private normalizeLang(lang: string): string {
    // Normalize variants to base language
    const normalized: Record<string, string> = {
      'en-GB': 'en',
      'en-US': 'en',
      'en-CH': 'en',
      'fr-CH': 'fr',
      'de-CH': 'de',
    };
    return normalized[lang] || lang;
  }
}
```

### 3. Translation Queue Module

```typescript
// api/src/translation/translation-queue.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'translation',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    PrismaModule,
  ],
  providers: [TranslationQueueProcessor, DeepLService],
  exports: [BullModule],
})
export class TranslationQueueModule {}
```

### 4. Translation Queue Processor

```typescript
// api/src/translation/translation-queue.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { DeepLService } from './deepl.service';
import { PrismaService } from '../prisma/prisma.service';

interface TranslationJobData {
  entityType: string;
  entityId: string;
  sourceLang: string;
}

@Processor('translation')
export class TranslationQueueProcessor {
  private readonly logger = new Logger(TranslationQueueProcessor.name);
  private readonly supportedLangs = ['en', 'fr', 'de'];

  constructor(
    private translationService: TranslationService,
    private deepLService: DeepLService,
    private prisma: PrismaService,
  ) {}

  @Process('translate-entity')
  async handleTranslation(job: Job<TranslationJobData>) {
    const { entityType, entityId, sourceLang } = job.data;

    this.logger.log(
      `Processing translation job for ${entityType}:${entityId} (source: ${sourceLang})`,
    );

    try {
      // Get source translations
      const sourceTranslations = await this.prisma.entityTranslation.findMany({
        where: {
          entityType,
          entityId,
          lang: sourceLang,
        },
      });

      if (sourceTranslations.length === 0) {
        this.logger.warn(`No source translations found for ${entityType}:${entityId}`);
        return;
      }

      // Get target languages
      const targetLangs = this.supportedLangs.filter((lang) => lang !== sourceLang);

      // Process each field for each target language
      for (const sourceTranslation of sourceTranslations) {
        const newHash = sourceTranslation.sourceHash;

        for (const targetLang of targetLangs) {
          // Check if translation already exists and is up to date
          const existing = await this.prisma.entityTranslation.findUnique({
            where: {
              entityType_entityId_lang_field: {
                entityType,
                entityId,
                lang: targetLang,
                field: sourceTranslation.field,
              },
            },
          });

          if (existing && existing.sourceHash === newHash) {
            // Translation is up to date, skip
            continue;
          }

          try {
            // Translate using DeepL
            const translatedText = await this.deepLService.translate(
              sourceTranslation.text,
              sourceLang,
              targetLang,
            );

            // Save translation
            await this.prisma.entityTranslation.upsert({
              where: {
                entityType_entityId_lang_field: {
                  entityType,
                  entityId,
                  lang: targetLang,
                  field: sourceTranslation.field,
                },
              },
              update: {
                text: translatedText,
                sourceHash: newHash,
                updatedAt: new Date(),
                origin: 'machine',
                mtProvider: 'deepl',
              },
              create: {
                entityType,
                entityId,
                lang: targetLang,
                field: sourceTranslation.field,
                text: translatedText,
                sourceHash: newHash,
                origin: 'machine',
                verified: false,
                mtProvider: 'deepl',
              },
            });

            this.logger.log(
              `Translated ${entityType}:${entityId} ${sourceTranslation.field} (${sourceLang} -> ${targetLang})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to translate ${entityType}:${entityId} ${sourceTranslation.field} to ${targetLang}: ${error.message}`,
            );
            // Continue with other translations
          }
        }
      }

      this.logger.log(`Completed translation job for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(
        `Translation job failed for ${entityType}:${entityId}: ${error.message}`,
        error.stack,
      );
      throw error; // Will trigger retry
    }
  }
}
```

### 5. Update Translation Service to Use Queue

```typescript
// api/src/translation/translation.service.ts
// Add to existing service:

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

// In constructor:
constructor(
  private prisma: PrismaService,
  private configService: ConfigService,
  @InjectQueue('translation') private translationQueue: Queue, // Add this
) {}

// Update saveEntityWithTranslations method:
async saveEntityWithTranslations(
  entityType: string,
  entityId: string,
  payload: Record<string, any>,
  translatableFields: string[],
): Promise<void> {
  // ... existing detection and source save logic ...

  // Enqueue async translation job (non-blocking)
  await this.translationQueue.add(
    'translate-entity',
    {
      entityType,
      entityId,
      sourceLang: detection.lang,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  this.logger.log(`Enqueued translation job for ${entityType}:${entityId}`);
  
  // Remove the synchronous translateEntity call:
  // await this.translateEntity(entityType, entityId); // ❌ Remove this
}
```

### 6. Update Translation Module

```typescript
// api/src/translation/translation.module.ts

import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationQueueModule } from './translation-queue.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TranslationQueueModule, // Add this
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
```

---

## 🧠 Translation Memory & Cost Guardrails

### 1. Translation Memory Service

```typescript
// api/src/translation/translation-memory.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TranslationMemoryService {
  private readonly logger = new Logger(TranslationMemoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get translation from memory if exists
   */
  async getFromMemory(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string | null> {
    const sourceTextHash = this.hashText(sourceText);

    const memory = await this.prisma.translationMemory.findUnique({
      where: {
        sourceTextHash_sourceLang_targetLang: {
          sourceTextHash,
          sourceLang,
          targetLang,
        },
      },
    });

    if (memory) {
      // Update usage stats
      await this.prisma.translationMemory.update({
        where: { id: memory.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      this.logger.log(
        `Translation memory hit: ${sourceLang} -> ${targetLang} (saved ${sourceText.length} chars)`,
      );
      return memory.translatedText;
    }

    return null;
  }

  /**
   * Save translation to memory
   */
  async saveToMemory(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    translatedText: string,
    mtProvider: string,
  ): Promise<void> {
    const sourceTextHash = this.hashText(sourceText);

    await this.prisma.translationMemory.upsert({
      where: {
        sourceTextHash_sourceLang_targetLang: {
          sourceTextHash,
          sourceLang,
          targetLang,
        },
      },
      update: {
        translatedText,
        mtProvider,
        lastUsedAt: new Date(),
      },
      create: {
        sourceTextHash,
        sourceLang,
        targetLang,
        translatedText,
        mtProvider,
      },
    });
  }

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
```

### 2. Cost Tracking Service

```typescript
// api/src/translation/cost-tracking.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// DeepL pricing (as of 2024): ~€20 per 1M characters
const DEEPL_COST_PER_CHAR = 0.00002; // €0.00002 per character

@Injectable()
export class CostTrackingService {
  private readonly logger = new Logger(CostTrackingService.name);
  private readonly monthlyBudget: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.monthlyBudget = parseFloat(
      this.configService.get<string>('MT_MONTHLY_BUDGET_CHF', '500'),
    );
  }

  /**
   * Track MT API usage and cost
   */
  async trackUsage(
    provider: string,
    sourceLang: string,
    targetLang: string,
    characters: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cost = this.calculateCost(provider, characters);

    await this.prisma.mTCostTracking.upsert({
      where: {
        date_provider_sourceLang_targetLang: {
          date: today,
          provider,
          sourceLang,
          targetLang,
        },
      },
      update: {
        characters: { increment: characters },
        cost: { increment: cost },
        jobCount: { increment: 1 },
      },
      create: {
        date: today,
        provider,
        sourceLang,
        targetLang,
        characters,
        cost,
        jobCount: 1,
      },
    });

    // Check budget and alert if needed
    await this.checkBudget();
  }

  /**
   * Get monthly usage and cost
   */
  async getMonthlyUsage(month?: Date): Promise<{
    totalCharacters: number;
    totalCost: number;
    byProvider: Record<string, { characters: number; cost: number }>;
  }> {
    const startDate = month || new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await this.prisma.mTCostTracking.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalCharacters = records.reduce((sum, r) => sum + r.characters, 0);
    const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);

    const byProvider = records.reduce((acc, r) => {
      if (!acc[r.provider]) {
        acc[r.provider] = { characters: 0, cost: 0 };
      }
      acc[r.provider].characters += r.characters;
      acc[r.provider].cost += Number(r.cost);
      return acc;
    }, {} as Record<string, { characters: number; cost: number }>);

    return { totalCharacters, totalCost, byProvider };
  }

  /**
   * Check if monthly budget is exceeded
   */
  private async checkBudget(): Promise<void> {
    const usage = await this.getMonthlyUsage();
    const percentage = (usage.totalCost / this.monthlyBudget) * 100;

    if (percentage >= 100) {
      this.logger.error(
        `MT budget exceeded! Used: CHF ${usage.totalCost.toFixed(2)} / CHF ${this.monthlyBudget}`,
      );
      // TODO: Send alert (email, Slack, etc.)
    } else if (percentage >= 80) {
      this.logger.warn(
        `MT budget at ${percentage.toFixed(1)}%: CHF ${usage.totalCost.toFixed(2)} / CHF ${this.monthlyBudget}`,
      );
      // TODO: Send warning alert
    }
  }

  private calculateCost(provider: string, characters: number): number {
    // Convert to CHF (assuming 1 EUR = 0.95 CHF)
    if (provider === 'deepl') {
      return characters * DEEPL_COST_PER_CHAR * 0.95;
    }
    // Add other providers as needed
    return 0;
  }
}
```

### 3. Enhanced Translation Queue Processor with TM

```typescript
// Update translation-queue.processor.ts to use TM

@Processor('translation')
export class TranslationQueueProcessor {
  constructor(
    private translationService: TranslationService,
    private deepLService: DeepLService,
    private translationMemory: TranslationMemoryService, // Add this
    private costTracking: CostTrackingService, // Add this
    private prisma: PrismaService,
  ) {}

  @Process('translate-entity')
  async handleTranslation(job: Job<TranslationJobData>) {
    const { entityType, entityId, sourceLang } = job.data;
    const jobId = job.id;

    // Check idempotency: skip if already processing/processed
    const idempotencyKey = `${entityType}:${entityId}:${job.data.sourceHash || 'latest'}`;
    const existingJob = await this.prisma.translationJob.findFirst({
      where: {
        entityType,
        entityId,
        status: { in: ['processing', 'completed'] },
      },
    });

    if (existingJob && existingJob.id !== jobId) {
      this.logger.log(`Skipping duplicate job for ${entityType}:${entityId}`);
      return;
    }

    // ... existing code to get source translations ...

    for (const sourceTranslation of sourceTranslations) {
      for (const targetLang of targetLangs) {
        // Check Translation Memory first
        let translatedText = await this.translationMemory.getFromMemory(
          sourceTranslation.text,
          sourceLang,
          targetLang,
        );

        if (!translatedText) {
          // Not in memory, call DeepL
          try {
            translatedText = await this.deepLService.translate(
              sourceTranslation.text,
              sourceLang,
              targetLang,
            );

            // Track cost
            await this.costTracking.trackUsage(
              'deepl',
              sourceLang,
              targetLang,
              sourceTranslation.text.length,
            );

            // Save to memory for future use
            await this.translationMemory.saveToMemory(
              sourceTranslation.text,
              sourceLang,
              targetLang,
              translatedText,
              'deepl',
            );
          } catch (error) {
            this.logger.error(`DeepL translation failed: ${error.message}`);
            // TODO: Fallback to Google Translate
            throw error; // Will trigger retry
          }
        }

        // Save translation with status
        await this.prisma.entityTranslation.upsert({
          where: {
            entityType_entityId_lang_field: {
              entityType,
              entityId,
              lang: targetLang,
              field: sourceTranslation.field,
            },
          },
          update: {
            text: translatedText,
            sourceHash: newHash,
            status: 'MT_DONE', // Set status
            updatedAt: new Date(),
            translatedAt: new Date(),
            origin: 'machine',
            mtProvider: 'deepl',
          },
          create: {
            entityType,
            entityId,
            lang: targetLang,
            field: sourceTranslation.field,
            text: translatedText,
            sourceHash: newHash,
            status: 'MT_DONE',
            origin: 'machine',
            verified: false,
            mtProvider: 'deepl',
            translatedAt: new Date(),
          },
        });
      }
    }
  }
}
```

### 4. Dead Letter Queue (DLQ) Setup

```typescript
// Add to translation-queue.module.ts

BullModule.registerQueue({
  name: 'translation',
  // ... existing config ...
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for DLQ
  },
}),

// Create DLQ processor
@Processor('translation-dlq')
export class TranslationDLQProcessor {
  @Process()
  async handleFailedJob(job: Job) {
    this.logger.error(`Translation job permanently failed: ${job.id}`, job.data);
    // TODO: Send alert, log to monitoring system
  }
}
```

---

## 🔒 Security & Compliance

### 1. Rate Limiting

```typescript
// Already added to controller with @Throttle decorator
// Configure in app.module.ts:

ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100, // 100 requests per minute for public endpoint
}),
```

### 2. PII Stripping for MT

```typescript
// api/src/translation/pii-stripper.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class PIIStripperService {
  /**
   * Strip PII from text before sending to MT
   * Replace with placeholders that can be restored
   */
  stripPII(text: string): { cleaned: string; placeholders: Map<string, string> } {
    const placeholders = new Map<string, string>();
    let cleaned = text;

    // Email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    cleaned = cleaned.replace(emailRegex, (match) => {
      const placeholder = `[EMAIL_${placeholders.size}]`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Phone numbers (Swiss format)
    const phoneRegex = /(\+41|0)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}/g;
    cleaned = cleaned.replace(phoneRegex, (match) => {
      const placeholder = `[PHONE_${placeholders.size}]`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Credit card numbers (if any)
    const cardRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    cleaned = cleaned.replace(cardRegex, (match) => {
      const placeholder = `[CARD_${placeholders.size}]`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    return { cleaned, placeholders };
  }

  /**
   * Restore PII after translation
   */
  restorePII(translated: string, placeholders: Map<string, string>): string {
    let restored = translated;
    placeholders.forEach((original, placeholder) => {
      restored = restored.replace(placeholder, original);
    });
    return restored;
  }
}

// Use in translation processor:
const { cleaned, placeholders } = this.piiStripper.stripPII(sourceText);
const translated = await this.deepLService.translate(cleaned, sourceLang, targetLang);
const final = this.piiStripper.restorePII(translated, placeholders);
```

### 3. Field Eligibility Check

```typescript
// Only translate allowed fields
const ALLOWED_MT_FIELDS: Record<string, string[]> = {
  product: ['title', 'description', 'features'],
  article: ['title', 'body'],
  // Exclude sensitive fields
  user: [], // Don't auto-translate user content
};

// In processor:
const allowedFields = ALLOWED_MT_FIELDS[entityType] || [];
if (!allowedFields.includes(field)) {
  this.logger.warn(`Skipping MT for restricted field: ${entityType}.${field}`);
  continue;
}
```

---

## 👥 Admin Governance

### 1. Release Management Endpoints

```typescript
// Add to StaticTranslationController

@Post('admin/releases')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: 'Create new translation release' })
async createRelease(
  @Body() body: { version: string; description?: string },
  @Request() req: any,
): Promise<{ success: boolean; version: string }> {
  await this.service.createRelease(
    body.version,
    body.description || '',
    req.user.id,
  );
  return { success: true, version: body.version };
}

@Get('admin/releases')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
async listReleases() {
  return this.service.listReleases();
}
```

### 2. Bulk Approval

```typescript
// Add to StaticTranslationController

@Post('admin/bulk-approve')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
async bulkApprove(
  @Body() body: { keys: Array<{ namespace: string; key: string; lang: string }> },
  @Request() req: any,
) {
  await this.service.bulkApprove(body.keys, req.user.id);
  return { success: true, approved: body.keys.length };
}

// In service:
async bulkApprove(
  keys: Array<{ namespace: string; key: string; lang: string }>,
  approvedBy: string,
): Promise<void> {
  await Promise.all(
    keys.map(({ namespace, key, lang }) =>
      this.prisma.staticTranslation.update({
        where: { namespace_key_lang: { namespace, key, lang } },
        data: {
          needsReview: false,
          reviewedBy: approvedBy,
          reviewedAt: new Date(),
        },
      }),
    ),
  );
}
```

### 3. Export/Import

```typescript
// Export translations to CSV/JSON
@Get('admin/export')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
async exportTranslations(
  @Query('format') format: 'json' | 'csv' = 'json',
  @Query('namespace') namespace?: string,
): Promise<any> {
  const translations = await this.service.listKeys(namespace);
  
  if (format === 'csv') {
    // Convert to CSV format
    return this.convertToCSV(translations);
  }
  
  return translations;
}

// Import translations
@Post('admin/import')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
async importTranslations(
  @Body() translations: Array<{ namespace: string; key: string; lang: string; value: string }>,
  @Request() req: any,
) {
  const count = await this.service.bulkUpsert(translations, req.user.id);
  return { success: true, imported: count };
}
```

### 4. Audit Log Viewing

```typescript
@Get('admin/audit-logs')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
async getAuditLogs(
  @Query('type') type?: 'static' | 'dynamic',
  @Query('limit') limit = 100,
) {
  return this.service.getAuditLogs(type, limit);
}
```

### 5. RBAC for Translation Roles

```typescript
// Add to auth decorators
export enum TranslationRole {
  TRANSLATOR = 'TRANSLATOR', // Can edit translations
  REVIEWER = 'REVIEWER', // Can review and approve
  ADMIN = 'ADMIN', // Can manage releases
}

// Use in controller:
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, TranslationRole.REVIEWER)
```

---

## 📦 Migration Strategy

### Phase 1: Database Setup (Day 1)

1. **Create migration**
```bash
cd api
pnpm prisma migrate dev --name add_static_translations
```

2. **Run migration**
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### Phase 2: Import Existing Translations (Day 1-2)

```typescript
// api/scripts/import-static-translations.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importTranslations() {
  const localesDir = path.join(__dirname, '../../packages/translations/locales');
  const languages = ['en', 'fr', 'de'];
  const namespaces = [
    'common', 'auth', 'dashboard', 'settings', 'billing',
    'elearning', 'supplier', 'hr', 'emails', 'marketplace',
    'recruitment', 'users', 'content', 'messages', 'admin',
    'profile', 'signup', 'pricing', 'parentLeadForm',
  ];

  for (const lang of languages) {
    for (const ns of namespaces) {
      const filePath = path.join(localesDir, lang, `${ns}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${lang}/${ns} - file not found`);
        continue;
      }

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const translations = flattenObject(content, ns);

      for (const [key, value] of Object.entries(translations)) {
        await prisma.staticTranslation.upsert({
          where: {
            namespace_key_lang: {
              namespace: ns,
              key,
              lang,
            },
          },
          update: {
            value: value as string,
          },
          create: {
            namespace: ns,
            key,
            lang,
            value: value as string,
          },
        });
      }

      console.log(`Imported ${lang}/${ns}: ${Object.keys(translations).length} keys`);
    }
  }
}

function flattenObject(obj: any, prefix: string = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

importTranslations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
cd api
ts-node scripts/import-static-translations.ts
```

### Phase 3: Backend Implementation (Day 2-3)

1. Implement StaticTranslationService
2. Implement StaticTranslationController
3. Set up TranslationQueueModule
4. Implement DeepLService
5. Update TranslationService to use queue

### Phase 4: Frontend Implementation (Day 3-4)

1. Update i18n config with runtime loading
2. Implement IndexedDB cache
3. Update app initialization
4. Test with network throttling

### Phase 5: Admin UI (Day 4-5)

1. Create Translations page
2. Add to admin routes
3. Test CRUD operations

### Phase 6: Testing & Deployment (Day 5-7)

1. End-to-end testing
2. Performance testing
3. Deploy to staging
4. Deploy to production

---

## 🚀 Deployment Plan

### Environment Variables

```bash
# Backend (.env)
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
DEEPL_API_KEY=your-deepl-api-key

# Frontend (.env)
VITE_API_URL=https://your-api.onrender.com
```

### Render Deployment

1. **Update render.yaml** (if needed)
2. **Deploy backend** with new dependencies
3. **Deploy frontend** with updated i18n config
4. **Deploy admin** with translation management page

### Post-Deployment

1. Run migration script
2. Import existing translations
3. Verify API endpoints
4. Test translation loading
5. Monitor queue health

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// api/src/static-translation/static-translation.service.spec.ts
// Test cache, nesting, CRUD operations

// api/src/translation/translation-queue.processor.spec.ts
// Test job processing, error handling
```

### Integration Tests

```typescript
// Test API endpoints
// Test queue processing
// Test cache invalidation
```

### E2E Tests

```typescript
// Test frontend translation loading
// Test admin UI translation management
// Test dynamic content translation flow
```

---

## 📊 Monitoring & Observability

### Metrics to Track

1. **Static Translations**
   - API response times
   - Cache hit rates
   - Missing translation keys

2. **Dynamic Translations**
   - Queue depth
   - Job processing time
   - MT API costs
   - Translation coverage

### Logging

```typescript
// Log translation requests
// Log queue job status
// Log MT API errors
// Log cache misses
```

### Alerts

- Queue depth > 1000
- MT API errors > 5%
- Cache hit rate < 80%
- Missing translations > 10%

---

## ✅ Summary

This enhanced unified plan provides:

### Core Features
1. **Static UI**: Database-backed with admin UI, runtime loading, zero redeploy
2. **Dynamic Content**: Async MT pipeline with DeepL, queue-based processing
3. **Unified Architecture**: Single database, single admin UI, consistent patterns
4. **Performance**: Multi-layer caching (Redis, IndexedDB, HTTP)

### Production-Ready Enhancements

#### ✅ Cache Versioning & ETag Support
- ETag headers for efficient cache validation
- Translation release versioning system
- Cache-Control headers with stale-while-revalidate
- Version query parameter for cache-busting

#### ✅ Translation Lifecycle Management
- Explicit status enum: `PENDING | MT_DONE | REVIEWED | APPROVED`
- Approval tracking with timestamps and user IDs
- Status-based filtering and workflows

#### ✅ Translation Memory (TM)
- Database-backed TM to avoid re-translating identical content
- Automatic TM lookup before calling MT APIs
- Usage statistics tracking
- Significant cost savings for repeated content

#### ✅ Cost Guardrails
- Real-time cost tracking per provider/language pair
- Monthly budget monitoring with alerts at 80%/100%
- Character count tracking
- Cost calculation for DeepL and extensible for other providers

#### ✅ Security & Compliance
- Rate limiting on public endpoints (100 req/min)
- PII stripping before MT (emails, phones, cards)
- Field eligibility whitelist
- Audit logging for all translation changes

#### ✅ Admin Governance
- Release management (create, activate, version)
- Bulk approval workflows
- Export/Import (JSON/CSV) for offline review
- Audit log viewing with filtering
- RBAC for translation roles (Translator, Reviewer, Admin)

#### ✅ Enhanced DeepL Integration
- Proper language mapping (EN-GB for Swiss context)
- Language normalization (handles variants)
- Fallback provider support (ready for Google Translate)
- Error handling with retries

#### ✅ Dead Letter Queue (DLQ)
- Failed job tracking
- Alert system for permanent failures
- Job idempotency to prevent duplicates

#### ✅ Frontend Optimizations
- Version-aware loading with cache-busting
- `saveMissing` disabled in production
- Proper fallback chain (fr-CH → fr → en)
- ICU formatting for dates, currency, numbers

### Implementation Timeline

**Total Implementation Time**: 10-12 days (enhanced from 7-10)

- **Days 1-2**: Database schema + migrations
- **Days 2-4**: Backend services (static, dynamic, TM, cost tracking)
- **Days 4-6**: Frontend runtime loading + version support
- **Days 6-8**: Admin UI with governance features
- **Days 8-10**: Security, PII stripping, testing
- **Days 10-12**: Deployment, monitoring setup, documentation

### Key Improvements Over Original Plan

| Feature | Original | Enhanced |
|---------|----------|----------|
| Cache-busting | ❌ None | ✅ ETag + version system |
| Translation states | ❌ Basic | ✅ Full lifecycle (PENDING → APPROVED) |
| Translation Memory | ❌ None | ✅ Database-backed TM |
| Cost tracking | ❌ Alerts only | ✅ Budget caps + monitoring |
| PII protection | ❌ None | ✅ Stripping + restoration |
| Release management | ❌ None | ✅ Version releases + promotion |
| Audit logging | ❌ None | ✅ Full audit trail |
| Language mapping | ⚠️ Basic | ✅ EN-GB normalization |

### Environment Variables Required

```bash
# Backend
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
DEEPL_API_KEY=your-deepl-api-key
MT_MONTHLY_BUDGET_CHF=500  # Monthly budget in CHF
GOOGLE_TRANSLATE_API_KEY=optional-fallback

# Frontend
VITE_API_URL=https://your-api.onrender.com
```

### Next Steps

1. Review and approve this enhanced plan
2. Set up development environment
3. Create database migrations
4. Implement services incrementally
5. Test each component thoroughly
6. Deploy to staging
7. Monitor and iterate

**Ready to implement! 🚀**
