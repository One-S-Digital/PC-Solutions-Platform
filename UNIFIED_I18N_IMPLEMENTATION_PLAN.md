# Unified i18n Implementation Plan
## Static UI (Database-Backed) + Dynamic Content (MT Pipeline)

**Objective**: Zero-redeploy i18n system with unified database-backed architecture for both static UI and dynamic content translations.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Admin UI Implementation](#admin-ui-implementation)
6. [Dynamic Content MT Pipeline](#dynamic-content-mt-pipeline)
7. [Migration Strategy](#migration-strategy)
8. [Deployment Plan](#deployment-plan)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring & Observability](#monitoring--observability)

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

### 2. Enhanced Entity Translation (already exists, may need updates)

```prisma
// Already exists, but ensure these fields are present:
model EntityTranslation {
  entityType String
  entityId   String
  lang       String
  field      String
  text       String   @db.Text
  origin     String   @default("machine") // 'machine' | 'human'
  verified   Boolean  @default(false)
  sourceHash String
  updatedAt  DateTime @default(now())
  // Optional: Add these for better tracking
  translatedAt DateTime?
  mtProvider    String?  // 'deepl' | 'google' | 'manual'
  
  @@id([entityType, entityId, lang, field])
  @@index([entityType, lang])
  @@map("entity_translations")
}
```

### 3. Translation Job Queue (for tracking)

```prisma
// Optional: Track translation jobs
model TranslationJob {
  id          String   @id @default(cuid())
  entityType  String
  entityId    String
  sourceLang  String
  targetLangs String[] // Array of target languages
  status      String   @default("pending") // 'pending' | 'processing' | 'completed' | 'failed'
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  @@index([status, createdAt])
  @@map("translation_jobs")
}
```

### Migration File

```sql
-- api/prisma/migrations/XXXXXX_add_static_translations/migration.sql

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

-- Optional: Add translation_jobs table
CREATE TABLE "translation_jobs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLangs" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "translation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "translation_jobs_status_createdAt_idx" ON "translation_jobs"("status", "createdAt");
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
   */
  async getByNamespace(lang: string, namespace: string): Promise<Record<string, any>> {
    const cacheKey = `static:${lang}:${namespace}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<Record<string, any>>(cacheKey);
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
      },
    });

    // Transform flat keys to nested object structure
    // e.g., 'buttons.submit' -> { buttons: { submit: '...' } }
    const result = this.nestKeys(translations);

    // Cache result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);

    return result;
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

    // Invalidate cache
    await this.invalidateCache(lang, namespace);

    this.logger.log(`Updated static translation: ${namespace}:${key} (${lang})`);
    return translation;
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
   */
  @Get(':lang/:namespace')
  @ApiOperation({ summary: 'Get static translations (public)' })
  @ApiResponse({ status: 200, description: 'Translations retrieved' })
  async getTranslations(
    @Param('lang') lang: string,
    @Param('namespace') namespace: string,
  ): Promise<Record<string, any>> {
    return this.service.getByNamespace(lang, namespace);
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
      loadPath: `${API_URL}/static-translations/{{lng}}/{{ns}}`,
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
    saveMissing: import.meta.env.DEV, // Only in dev
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

  private mapToDeepLCode(lang: string): string | null {
    const mapping: Record<string, string> = {
      en: 'EN',
      fr: 'FR',
      de: 'DE',
    };
    return mapping[lang] || null;
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

This unified plan provides:

1. **Static UI**: Database-backed with admin UI, runtime loading, zero redeploy
2. **Dynamic Content**: Async MT pipeline with DeepL, queue-based processing
3. **Unified Architecture**: Single database, single admin UI, consistent patterns
4. **Performance**: Multi-layer caching (Redis, IndexedDB, HTTP)
5. **Future-proof**: Extensible, observable, maintainable

**Total Implementation Time**: 7-10 days
**Complexity**: Medium
**Maintenance**: Low (unified system)

Ready to implement! 🚀
