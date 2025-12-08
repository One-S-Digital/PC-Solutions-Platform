# Cantonal Policy Document Tracking System - Implementation Plan

> **Revised to integrate with existing ProCrèche infrastructure**

## 1. Scope & Business Rules

### 1.1 Core Principles (Unchanged)
- **No re-hosting**: Link directly to official PDFs/HTML pages on cantonal/federal sites
- **Semi-automated workflow**: Crawler discovers → Admin approves → Users see
- **Legal disclaimer**: Required on all policy-related UI

### 1.2 Legal Disclaimer Text
```text
"All policies and documents listed here are sourced directly from official cantonal 
and federal websites. ProCrèche does not create, modify or guarantee the legal 
validity of these documents and cannot be held liable for their content or for any 
changes made by the issuing authorities. Always refer to the official source for 
the latest version."
```

---

## 2. Architecture Overview

### 2.1 What Already Exists (DO NOT REBUILD)

| Component | Location | Purpose |
|-----------|----------|---------|
| **Asset Model** | `api/prisma/schema.prisma` | Stores policies with `category: 'STATE_POLICY'` |
| **Content Service** | `api/src/content/content.service.ts` | Full CRUD for state policies |
| **Content Controller** | `api/src/content/content.controller.ts` | REST endpoints `/content/state-policies/*` |
| **StatePoliciesPage** | `frontend/pages/StatePoliciesPage.tsx` | Frontend display |
| **PolicyAlert Model** | `api/prisma/schema.prisma` | Alert banners |
| **BullMQ** | `api/src/translation/translation-queue.module.ts` | Background job queue |
| **@nestjs/schedule** | `api/src/sync/outbox.worker.ts` | Cron scheduling |
| **Translation Service** | `api/src/translation/translation.service.ts` | Multi-language support |
| **Cloudflare R2** | `api/src/upload/cloudflare-r2.service.ts` | File storage (internal use only) |

### 2.2 What We Need to Add

| Component | Purpose |
|-----------|---------|
| **CantonSource table** | Admin-defined source URLs per canton |
| **PolicyCrawlHistory table** | Track content changes over time |
| **Crawler Service** | Background worker to fetch & classify documents |
| **Admin UI extensions** | Manage sources, review queue |
| **Frontend enhancements** | Canton navigation, mobile UX, disclaimer |

---

## 3. Data Model Changes

### 3.1 New Tables (Prisma Migration)

```prisma
// Add to api/prisma/schema.prisma

// Canton reference data
model Canton {
  id          Int      @id @default(autoincrement())
  code        String   @unique  // 'VD', 'FR', 'ZH'
  name        String             // 'Vaud', 'Fribourg', 'Zurich'
  nameDe      String?            // German name
  nameIt      String?            // Italian name
  nameFr      String?            // French name
  defaultLang String   @default("de")  // 'fr', 'de', 'it'
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sources     CantonSource[]

  @@map("cantons")
}

// Crawler source URLs
model CantonSource {
  id           Int       @id @default(autoincrement())
  cantonId     Int
  canton       Canton    @relation(fields: [cantonId], references: [id])
  
  label        String    // "SCAJE - Main Page"
  url          String    // "https://www.vd.ch/themes/..."
  sourceType   String    @default("landing")  // 'landing', 'directives', 'laws', 'federal'
  renderType   String    @default("static")   // 'static' or 'dynamic' (needs Playwright)
  cssSelector  String?   // Optional content container selector
  
  isActive     Boolean   @default(true)
  crawlFrequencyDays Int @default(7)
  
  lastCrawlAt  DateTime?
  lastCrawlStatus String?  // 'success', 'failed', 'partial'
  lastCrawlError String?
  nextCrawlAt  DateTime?
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  crawlHistory PolicyCrawlHistory[]

  @@index([cantonId])
  @@index([isActive, nextCrawlAt])
  @@map("canton_sources")
}

// Track content changes (linked to existing Asset)
model PolicyCrawlHistory {
  id            Int       @id @default(autoincrement())
  assetId       String    // Links to Asset.id where category = 'STATE_POLICY'
  sourceId      Int
  source        CantonSource @relation(fields: [sourceId], references: [id])
  
  contentHash   String    // SHA-256 of normalized text
  fetchedAt     DateTime  @default(now())
  changeType    String?   // 'new', 'updated', 'unchanged'
  diffSummary   String?   // Admin notes on what changed
  
  // For internal indexing (not exposed to users)
  contentText   String?   @db.Text
  
  @@index([assetId])
  @@index([sourceId, fetchedAt])
  @@map("policy_crawl_history")
}
```

### 3.2 Extend Existing Asset Model

Add these fields to the existing `Asset` model:

```prisma
// Add to existing Asset model in api/prisma/schema.prisma

model Asset {
  // ... existing fields ...
  
  // NEW: Crawler integration fields
  crawlSourceId     Int?      // FK to CantonSource (null = manually uploaded)
  officialUrl       String?   // The canonical URL on official site (separate from publicUrl)
  contentHash       String?   // Current content hash for change detection
  lastCrawledAt     DateTime? // When crawler last checked this document
  crawlStatus       String?   // 'pending_review', 'approved', 'rejected', 'manual'
  
  // Index for crawler queries
  @@index([crawlSourceId])
  @@index([crawlStatus])
}
```

### 3.3 Canton Code Mapping

Add to `frontend/types.ts` and create shared package:

```typescript
// Add to frontend/types.ts (or packages/types/src/cantons.ts)

export const CANTON_CODES = {
  'AG': 'Aargau',
  'AR': 'Appenzell Ausserrhoden',
  'AI': 'Appenzell Innerrhoden',
  'BL': 'Basel-Landschaft',
  'BS': 'Basel-Stadt',
  'BE': 'Bern',
  'FR': 'Fribourg',
  'GE': 'Geneva',
  'GL': 'Glarus',
  'GR': 'Grisons',
  'JU': 'Jura',
  'LU': 'Lucerne',
  'NE': 'Neuchâtel',
  'NW': 'Nidwalden',
  'OW': 'Obwalden',
  'SH': 'Schaffhausen',
  'SZ': 'Schwyz',
  'SO': 'Solothurn',
  'SG': 'St. Gallen',
  'TG': 'Thurgau',
  'TI': 'Ticino',
  'UR': 'Uri',
  'VS': 'Valais',
  'VD': 'Vaud',
  'ZG': 'Zug',
  'ZH': 'Zurich',
  'CH': 'Federal (Switzerland)', // For federal documents
} as const;

export type CantonCode = keyof typeof CANTON_CODES;

export const CANTON_DEFAULT_LANGUAGES: Record<CantonCode, 'fr' | 'de' | 'it'> = {
  'AG': 'de', 'AR': 'de', 'AI': 'de', 'BL': 'de', 'BS': 'de',
  'BE': 'de', 'FR': 'fr', 'GE': 'fr', 'GL': 'de', 'GR': 'de',
  'JU': 'fr', 'LU': 'de', 'NE': 'fr', 'NW': 'de', 'OW': 'de',
  'SH': 'de', 'SZ': 'de', 'SO': 'de', 'SG': 'de', 'TG': 'de',
  'TI': 'it', 'UR': 'de', 'VS': 'fr', 'VD': 'fr', 'ZG': 'de',
  'ZH': 'de', 'CH': 'de',
};
```

---

## 4. Crawler Service Implementation

### 4.1 Module Structure

```text
api/src/crawler/
├── crawler.module.ts
├── crawler.service.ts         # Main orchestrator
├── crawler.scheduler.ts       # Cron job scheduling
├── parsers/
│   ├── html-parser.service.ts # Cheerio-based HTML parsing
│   ├── pdf-parser.service.ts  # PDF text extraction
│   └── playwright-renderer.service.ts  # For JS-heavy sites
├── classifier/
│   ├── classifier.service.ts  # Document classification
│   └── classifier.config.ts   # Keywords, patterns
├── dto/
│   └── crawler.dto.ts
└── __tests__/
    └── classifier.spec.ts
```

### 4.2 Crawler Strategy: Metadata-First (Minimal PDF Parsing)

**Key Insight**: We don't need to parse all PDFs. Most classification and change detection can be done using:
1. **Link metadata** from the source page (anchor text, URL, section heading)
2. **HTTP headers** from HEAD requests (ETag, Last-Modified, Content-Length)

**When to parse PDFs (rare cases):**
- Classification confidence < 50%
- Admin manually requests text extraction
- Future: full-text search feature

### 4.3 Crawler Service

```typescript
// api/src/crawler/crawler.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlParserService } from './parsers/html-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import { ClassifierService } from './classifier/classifier.service';
import { createHash } from 'crypto';

interface CandidateDocument {
  url: string;
  title: string;
  isPdf: boolean;
  sectionHeading?: string;
  anchorText: string;
}

interface HttpHeaders {
  etag: string;
  lastModified: string;
  contentLength: string;
}

/** Type for CantonSource with included Canton relation */
interface CantonSourceWithCanton {
  id: number;
  cantonId: number;
  label: string;
  url: string;
  sourceType: string;
  renderType: string;
  cssSelector: string | null;
  isActive: boolean;
  crawlFrequencyDays: number;
  lastCrawlAt: Date | null;
  lastCrawlStatus: string | null;
  lastCrawlError: string | null;
  nextCrawlAt: Date | null;
  canton: {
    id: number;
    code: string;
    name: string;
    defaultLang: string;
  };
}

/** Maximum file size for PDF downloads (50MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  /**
   * Whitelisted domains for SSRF prevention.
   * Only URLs from these domains (or subdomains) are allowed.
   */
  private readonly ALLOWED_DOMAINS = [
    // Cantonal domains
    'vd.ch', 'ge.ch', 'fr.ch', 'vs.ch', 'ne.ch', 'ju.ch',  // French-speaking
    'be.ch', 'zh.ch', 'ag.ch', 'lu.ch', 'sg.ch', 'tg.ch',  // German-speaking
    'bl.ch', 'bs.ch', 'so.ch', 'sh.ch', 'zg.ch', 'sz.ch',
    'nw.ch', 'ow.ch', 'ur.ch', 'gl.ch', 'ar.ch', 'ai.ch', 'gr.ch',
    'ti.ch',  // Italian-speaking
    // Federal domains
    'admin.ch', 'bfs.admin.ch', 'fedlex.admin.ch',
  ];

  constructor(
    private prisma: PrismaService,
    private htmlParser: HtmlParserService,
    private pdfParser: PdfParserService,
    private classifier: ClassifierService,
  ) {}

  async crawlSource(sourceId: number): Promise<{
    discovered: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    errors: string[];
  }> {
    const source = await this.prisma.cantonSource.findUnique({
      where: { id: sourceId },
      include: { canton: true },
    });

    if (!source || !source.isActive) {
      throw new Error(`Source ${sourceId} not found or inactive`);
    }

    const results = { 
      discovered: 0, 
      created: 0, 
      updated: 0, 
      unchanged: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Step 1: Fetch and parse source page (only HTML page, not PDFs)
      const html = await this.fetchPage(source.url, source.renderType === 'dynamic');
      const candidates = this.htmlParser.extractLinks(html, source.url, source.cssSelector);
      results.discovered = candidates.length;

      this.logger.log(`Source ${source.label}: Found ${candidates.length} candidate links`);

      // Step 2: Process each candidate with rate limiting
      for (const candidate of candidates) {
        try {
          const result = await this.processCandidate(candidate, source);
          results[result]++;
          
          // Per-document rate limit: 500ms between candidates
          // This is acceptable since we're mostly doing lightweight HEAD requests
          // (separate from 30s per-source delay in scheduler)
          await this.delay(500);
        } catch (error) {
          results.errors.push(`${candidate.url}: ${error.message}`);
          this.logger.error(`Failed to process ${candidate.url}: ${error.message}`);
        }
      }

      // Step 3: Update source status
      await this.prisma.cantonSource.update({
        where: { id: sourceId },
        data: {
          lastCrawlAt: new Date(),
          lastCrawlStatus: results.errors.length === 0 ? 'success' : 'partial',
          lastCrawlError: results.errors.length > 0 ? results.errors.slice(0, 3).join('; ') : null,
          nextCrawlAt: new Date(Date.now() + source.crawlFrequencyDays * 24 * 60 * 60 * 1000),
        },
      });

      return results;
    } catch (error) {
      await this.prisma.cantonSource.update({
        where: { id: sourceId },
        data: {
          lastCrawlAt: new Date(),
          lastCrawlStatus: 'failed',
          lastCrawlError: error.message,
          nextCrawlAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Retry in 1 day
        },
      });
      throw error;
    }
  }

  private async processCandidate(
    candidate: CandidateDocument,
    source: CantonSourceWithCanton,
  ): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
    
    // ==========================================
    // STEP 1: Classify using METADATA ONLY (no download)
    // ==========================================
    const classification = this.classifier.classifyFromMetadata({
      anchorText: candidate.anchorText,
      url: candidate.url,
      sectionHeading: candidate.sectionHeading,
      defaultLang: source.canton.defaultLang,
    });

    // High confidence it's NOT daycare-related → skip entirely
    if (!classification.isDaycareRelated && classification.confidence > 0.7) {
      this.logger.debug(`Skipping ${candidate.url} - not daycare-related (confidence: ${classification.confidence})`);
      return 'skipped';
    }

    // ==========================================
    // STEP 2: Get HTTP headers for change detection (HEAD request only)
    // ==========================================
    const headers = await this.fetchHeaders(candidate.url);
    const changeHash = this.generateChangeHash(headers);

    // ==========================================
    // STEP 3: Check if document exists
    // ==========================================
    const existingAsset = await this.prisma.asset.findFirst({
      where: {
        category: 'STATE_POLICY',
        officialUrl: candidate.url,
      },
    });

    if (existingAsset) {
      // Document exists - check if changed using hash
      if (existingAsset.contentHash === changeHash) {
        // No change - just update lastCrawledAt
        await this.prisma.asset.update({
          where: { id: existingAsset.id },
          data: { lastCrawledAt: new Date() },
        });
        return 'unchanged';
      }

      // Document changed - flag for review
      await this.prisma.policyCrawlHistory.create({
        data: {
          assetId: existingAsset.id,
          sourceId: source.id,
          contentHash: changeHash,
          changeType: 'updated',
        },
      });

      await this.prisma.asset.update({
        where: { id: existingAsset.id },
        data: {
          contentHash: changeHash,
          lastCrawledAt: new Date(),
          crawlStatus: 'pending_review',
        },
      });

      return 'updated';
    }

    // ==========================================
    // STEP 4: New document - only parse PDF if classification uncertain
    // ==========================================
    let contentText: string | undefined;
    let finalClassification = classification;

    // Only download and parse PDF if we're uncertain about classification
    if (classification.confidence < 0.5 && candidate.isPdf) {
      this.logger.log(`Low confidence (${classification.confidence.toFixed(2)}) for ${candidate.url}, parsing PDF...`);
      
      try {
        const buffer = await this.fetchBuffer(candidate.url);
        contentText = await this.pdfParser.extractText(buffer);
        
        // Re-classify with actual content
        finalClassification = this.classifier.classifyFromContent(
          contentText, 
          candidate,
          source.canton.defaultLang,
        );

        if (!finalClassification.isDaycareRelated) {
          this.logger.debug(`After parsing, ${candidate.url} still not daycare-related - skipping`);
          return 'skipped';
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse PDF ${candidate.url}: ${parseError.message}`);
        // Continue with metadata-based classification if parsing fails
      }
    }

    // ==========================================
    // STEP 5: Create new Asset
    // ==========================================
    const newAsset = await this.prisma.asset.create({
      data: {
        kind: 'DOCUMENT',
        category: 'STATE_POLICY',
        contentCategory: finalClassification.category,
        
        filename: this.extractFilename(candidate.url),
        publicUrl: '', // Not hosting the file
        storageKey: `crawler-${Date.now()}`,
        mimeType: candidate.isPdf ? 'application/pdf' : 'text/html',
        size: parseInt(headers.contentLength) || 0,
        uploadedById: 'system',
        
        // Use anchor text as title (admin can refine)
        title: this.cleanTitle(candidate.anchorText || candidate.title),
        // Leave description empty - admin writes summary during review
        description: '',
        contentPreview: contentText?.slice(0, 300) || '',
        
        country: 'Switzerland',
        region: source.canton.name,
        policyType: finalClassification.docType,
        language: finalClassification.language,
        status: 'Draft',
        
        // Crawler-specific fields
        crawlSourceId: source.id,
        officialUrl: candidate.url,
        contentHash: changeHash,
        lastCrawledAt: new Date(),
        crawlStatus: 'pending_review',
        
        externalLink: candidate.url,
        tags: finalClassification.topics,
      },
    });

    // Create initial history record
    await this.prisma.policyCrawlHistory.create({
      data: {
        assetId: newAsset.id,
        sourceId: source.id,
        contentHash: changeHash,
        changeType: 'new',
        contentText: contentText?.slice(0, 50000), // Only if we parsed it
      },
    });

    return 'created';
  }

  // ==========================================
  // HTTP UTILITIES
  // ==========================================

  /**
   * Validates URL against whitelist to prevent SSRF attacks.
   * Only allows requests to official cantonal and federal domains.
   * @throws Error if domain is not whitelisted
   */
  private validateUrl(url: string): void {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    const isAllowed = this.ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      throw new Error(`Domain '${hostname}' is not whitelisted. Only official cantonal and federal domains are allowed.`);
    }

    // Additional security: only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      throw new Error(`Only HTTPS URLs are allowed. Got: ${parsedUrl.protocol}`);
    }
  }

  private async fetchHeaders(url: string): Promise<HttpHeaders> {
    // SSRF prevention: validate URL before making request
    this.validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        etag: response.headers.get('etag') || '',
        lastModified: response.headers.get('last-modified') || '',
        contentLength: response.headers.get('content-length') || '0',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private generateChangeHash(headers: HttpHeaders): string {
    // Combine headers into a change detection hash
    // MD5 is acceptable here as this is for change detection only (not security).
    // ETag is most reliable, fall back to Last-Modified + Content-Length
    if (headers.etag) {
      return createHash('md5').update(headers.etag).digest('hex');
    }
    const combined = `${headers.lastModified}|${headers.contentLength}`;
    return createHash('md5').update(combined).digest('hex');
  }

  private async fetchPage(url: string, useDynamic: boolean): Promise<string> {
    // SSRF prevention: validate URL before making request
    this.validateUrl(url);

    if (useDynamic) {
      // Use Playwright for JS-heavy pages (implement separately)
      return this.fetchWithPlaywright(url);
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  private async fetchBuffer(url: string): Promise<Buffer> {
    // SSRF prevention: validate URL before making request
    this.validateUrl(url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Content-length validation to prevent memory exhaustion
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${contentLength} bytes) exceeds maximum allowed (${MAX_FILE_SIZE_BYTES} bytes)`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Double-check actual size (Content-Length can be missing or incorrect)
    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Downloaded file size (${arrayBuffer.byteLength} bytes) exceeds maximum allowed`);
    }

    return Buffer.from(arrayBuffer);
  }

  private async fetchWithPlaywright(url: string): Promise<string> {
    // Implement Playwright rendering for dynamic pages
    // This is optional - only needed for JS-heavy canton sites
    throw new Error('Playwright rendering not implemented');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanTitle(text: string): string {
    return text.replace(/\s+/g, ' ').trim().slice(0, 255);
  }

  private extractFilename(url: string): string {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'document';
  }
}
```

### 4.3 PDF Parser Service

```typescript
// api/src/crawler/parsers/pdf-parser.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = new Uint8Array(buffer);
      const doc = await pdfjsLib.getDocument({ data }).promise;
      
      const textContent: string[] = [];
      
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ');
        textContent.push(pageText);
      }
      
      return textContent.join('\n\n');
    } catch (error) {
      this.logger.error(`PDF parsing failed: ${error.message}`);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }
}
```

### 4.4 Classifier Service (Metadata-First)

```typescript
// api/src/crawler/classifier/classifier.service.ts

import { Injectable } from '@nestjs/common';
import { CLASSIFIER_CONFIG } from './classifier.config';

interface ClassificationResult {
  isDaycareRelated: boolean;
  confidence: number;
  category: string;      // Maps to Asset.contentCategory
  docType: string;       // Maps to Asset.policyType
  language: 'fr' | 'de' | 'it' | 'en';
  topics: string[];
}

interface MetadataInput {
  anchorText: string;
  url: string;
  sectionHeading?: string;
  defaultLang: string;
}

@Injectable()
export class ClassifierService {
  
  /**
   * PRIMARY METHOD: Classify using metadata only (no PDF download)
   * Used for 90%+ of documents
   */
  classifyFromMetadata(metadata: MetadataInput): ClassificationResult {
    const lang = this.detectLanguageFromText(metadata.anchorText, metadata.defaultLang);
    const keywords = CLASSIFIER_CONFIG.keywords[lang];
    
    let score = 0;
    const foundTopics: string[] = [];
    const combinedText = `${metadata.anchorText} ${metadata.sectionHeading || ''}`.toLowerCase();

    // Score from anchor text and section heading
    for (const [topic, terms] of Object.entries(keywords.topics)) {
      for (const term of terms) {
        if (combinedText.includes(term.toLowerCase())) {
          score += keywords.weights[topic] || 1;
          if (!foundTopics.includes(topic)) {
            foundTopics.push(topic);
          }
        }
      }
    }

    // Score from URL path (very reliable signal)
    const urlLower = metadata.url.toLowerCase();
    const urlKeywords: Record<string, number> = {
      'creche': 3, 'garderie': 3, 'accueil-de-jour': 4, 'accueil-prescolaire': 4,
      'kita': 3, 'kinderbetreuung': 3, 'kindertagesstaette': 4, 'tagesstruktur': 3,
      'nido': 3, 'asilo': 3,
      'enfan': 2, 'kind': 2, 'bambin': 2,
      'laje': 4, 'oaje': 4, 'laac': 4, // Swiss daycare law acronyms
    };
    
    for (const [kw, weight] of Object.entries(urlKeywords)) {
      if (urlLower.includes(kw)) {
        score += weight;
        if (!foundTopics.includes('structure')) {
          foundTopics.push('structure');
        }
      }
    }

    // Section heading boost (if link is under "Accueil de jour" section, high confidence)
    if (metadata.sectionHeading) {
      for (const boost of keywords.sectionBoosts) {
        if (metadata.sectionHeading.toLowerCase().includes(boost.toLowerCase())) {
          score *= 1.5;
          break;
        }
      }
    }

    // Negative signals from URL/anchor
    const negativePatterns = ['adoption', 'steuer', 'impot', 'divorce', 'mariage', 'succession'];
    for (const neg of negativePatterns) {
      if (urlLower.includes(neg) || combinedText.includes(neg)) {
        score *= 0.3;
      }
    }

    const docType = this.detectDocTypeFromMetadata(metadata.anchorText, metadata.url, lang);
    const category = this.mapToCategory(foundTopics);

    // Confidence calculation:
    // - Divisor of 10 calibrated for metadata-based classification where typical
    //   scores range from 0-15 based on keyword matches and URL patterns
    // - A score of 10+ indicates high confidence (100%)
    // - Threshold of 3 (from config) means at least one strong signal or multiple weak signals
    // - Expected accuracy: ~85-90% for metadata-only classification
    // - Tune threshold based on pilot testing false positive/negative rates
    return {
      isDaycareRelated: score >= CLASSIFIER_CONFIG.threshold,
      confidence: Math.min(score / 10, 1),
      category,
      docType,
      language: lang,
      topics: foundTopics,
    };
  }

  /**
   * SECONDARY METHOD: Classify using actual PDF content
   * Only called when metadata-based confidence is low
   */
  classifyFromContent(
    content: string,
    candidate: { url: string; anchorText: string; sectionHeading?: string },
    defaultLang: string,
  ): ClassificationResult {
    const lang = this.detectLanguageFromText(content, defaultLang);
    const keywords = CLASSIFIER_CONFIG.keywords[lang];
    const negativeKeywords = CLASSIFIER_CONFIG.negativeKeywords[lang];
    
    let score = 0;
    const foundTopics: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Score from actual content
    for (const [topic, terms] of Object.entries(keywords.topics)) {
      for (const term of terms) {
        // Count occurrences for better scoring
        const regex = new RegExp(term.toLowerCase(), 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += (keywords.weights[topic] || 1) * Math.min(matches.length, 3);
          if (!foundTopics.includes(topic)) {
            foundTopics.push(topic);
          }
        }
      }
    }
    
    // Negative keyword penalty
    for (const term of negativeKeywords) {
      if (contentLower.includes(term.toLowerCase())) {
        score *= 0.5;
      }
    }
    
    const docType = this.detectDocTypeFromContent(content, candidate.url, lang);
    const category = this.mapToCategory(foundTopics);
    
    // Confidence calculation for content-based classification:
    // - Divisor of 15 (vs 10 for metadata) because full PDF content typically
    //   yields more keyword matches, so we set a higher bar for "high confidence"
    // - This method is only called when metadata confidence < 50%, so we're
    //   looking for strong signals in the actual content to confirm relevance
    // - Expected accuracy: ~95% when we do parse the PDF
    return {
      isDaycareRelated: score >= CLASSIFIER_CONFIG.threshold,
      confidence: Math.min(score / 15, 1),
      category,
      docType,
      language: lang,
      topics: foundTopics,
    };
  }

  /**
   * Detects language from text using common word frequency.
   * Returns defaultLang if text is too short (< 50 chars) or inconclusive.
   */
  private detectLanguageFromText(text: string, defaultLang: string): 'fr' | 'de' | 'it' | 'en' {
    // Minimum 50 characters for reliable detection (raised from 20 per review feedback)
    if (!text || text.length < 50) return defaultLang as any;
    
    const frCount = (text.match(/\b(le|la|les|de|des|du|un|une|et|est|pour|avec|sur)\b/gi) || []).length;
    const deCount = (text.match(/\b(der|die|das|und|ist|für|mit|von|zu|den|dem|ein)\b/gi) || []).length;
    const itCount = (text.match(/\b(il|la|le|di|del|della|e|è|per|con|nel|un|una)\b/gi) || []).length;
    
    const max = Math.max(frCount, deCount, itCount);
    // Require at least 5 matches for reliable detection (raised from 3 per review feedback)
    if (max < 5) return defaultLang as any;
    
    if (frCount === max) return 'fr';
    if (deCount === max) return 'de';
    if (itCount === max) return 'it';
    return defaultLang as any;
  }

  private detectDocTypeFromMetadata(anchorText: string, url: string, lang: string): string {
    const combined = `${anchorText} ${url}`.toLowerCase();
    const patterns = CLASSIFIER_CONFIG.docTypePatterns[lang];
    
    for (const [type, regexList] of Object.entries(patterns)) {
      for (const pattern of regexList) {
        if (pattern.test(combined)) {
          return type;
        }
      }
    }
    
    // Default based on file extension
    if (url.toLowerCase().endsWith('.pdf')) {
      return 'Directive';
    }
    return 'Guideline';
  }

  private detectDocTypeFromContent(content: string, url: string, lang: string): string {
    const patterns = CLASSIFIER_CONFIG.docTypePatterns[lang];
    
    for (const [type, regexList] of Object.entries(patterns)) {
      for (const pattern of regexList) {
        if (pattern.test(content)) {
          return type;
        }
      }
    }
    
    return 'Directive';
  }
  
  private mapToCategory(topics: string[]): string {
    if (topics.includes('ratios') || topics.includes('authorisation') || topics.includes('staff') || topics.includes('structure')) {
      return 'Education Policy';
    }
    if (topics.includes('safety') || topics.includes('health')) {
      return 'Health & Safety';
    }
    if (topics.includes('employment') || topics.includes('contracts')) {
      return 'Labor & Employment';
    }
    if (topics.includes('protection') || topics.includes('welfare')) {
      return 'Child Protection';
    }
    if (topics.includes('funding')) {
      return 'Other'; // Financial support
    }
    return 'Other';
  }
}
```

### 4.5 Classifier Configuration

```typescript
// api/src/crawler/classifier/classifier.config.ts

export const CLASSIFIER_CONFIG = {
  /**
   * Minimum score to be considered daycare-related.
   * 
   * Tuning guidance:
   * - Lower (2): More documents flagged for review, higher false positive rate
   * - Current (3): Balanced - requires at least one strong keyword or multiple weak ones
   * - Higher (5): Fewer documents, may miss some relevant policies
   * 
   * Adjust based on pilot testing:
   * - If admins reject >30% of candidates → increase threshold
   * - If admins find missing policies → decrease threshold
   */
  threshold: 3,
  
  keywords: {
    fr: {
      topics: {
        ratios: ['taux d\'encadrement', 'ratio', 'nombre d\'enfants par adulte'],
        authorisation: ['autorisation d\'exploiter', 'autorisation', 'agrément', 'reconnaissance'],
        staff: ['personnel éducatif', 'qualification', 'formation', 'diplôme'],
        structure: ['crèche', 'garderie', 'accueil de jour', 'structures d\'accueil', 'accueil préscolaire', 'accueil parascolaire'],
        safety: ['sécurité', 'hygiène', 'locaux', 'normes'],
        parents: ['contrat', 'tarif', 'inscription', 'placement'],
        funding: ['subvention', 'financement', 'contribution', 'bon d\'accueil'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['directives', 'bases légales', 'loi', 'ordonnance', 'règlement', 'accueil de jour'],
    },
    de: {
      topics: {
        ratios: ['Betreuungsschlüssel', 'Betreuungsverhältnis', 'Kinder pro Betreuungsperson'],
        authorisation: ['Betriebsbewilligung', 'Bewilligung', 'Anerkennung', 'Genehmigung'],
        staff: ['Fachpersonal', 'Qualifikation', 'Ausbildung', 'Betreuungspersonen'],
        structure: ['Kindertagesstätte', 'Kita', 'Tagesstruktur', 'Kinderbetreuung', 'familienergänzende Betreuung'],
        safety: ['Sicherheit', 'Hygiene', 'Räumlichkeiten', 'Normen'],
        parents: ['Vertrag', 'Tarif', 'Anmeldung', 'Elternbeitrag'],
        funding: ['Subvention', 'Finanzierung', 'Beitrag', 'Betreuungsgutschein'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['Weisungen', 'Rechtsgrundlagen', 'Gesetz', 'Verordnung', 'Reglement', 'Kinderbetreuung'],
    },
    it: {
      topics: {
        ratios: ['rapporto di custodia', 'rapporto numerico', 'bambini per educatore'],
        authorisation: ['autorizzazione', 'riconoscimento', 'permesso'],
        staff: ['personale educativo', 'qualifica', 'formazione'],
        structure: ['asilo nido', 'nido', 'servizi di accoglienza', 'custodia diurna'],
        safety: ['sicurezza', 'igiene', 'locali', 'norme'],
        parents: ['contratto', 'tariffa', 'iscrizione'],
        funding: ['sovvenzione', 'finanziamento', 'contributo'],
      },
      weights: {
        ratios: 3,
        authorisation: 3,
        staff: 2,
        structure: 2,
        safety: 1,
        parents: 1,
        funding: 2,
      },
      sectionBoosts: ['direttive', 'basi legali', 'legge', 'ordinanza', 'regolamento'],
    },
  },
  
  negativeKeywords: {
    fr: ['adoption', 'fiscalité', 'impôts', 'succession', 'mariage', 'divorce', 'naturalisation'],
    de: ['Adoption', 'Steuern', 'Erbschaft', 'Heirat', 'Scheidung', 'Einbürgerung'],
    it: ['adozione', 'fiscale', 'imposte', 'successione', 'matrimonio', 'divorzio'],
  },
  
  docTypePatterns: {
    fr: {
      'Law': [/\bLoi\s+(?:fédérale\s+)?(?:sur|du|relative)/i, /\bLAJE\b/, /\bLAAc\b/],
      'Regulation': [/\bOrdonnance\s+(?:sur|du|relative)/i, /\bRèglement\s+(?:sur|du|relatif)/i],
      'Directive': [/\bDirectives?\s+(?:sur|concernant|relatives?)/i, /\bRecommandations?\b/i],
      'Guideline': [/\bGuide\b/i, /\bManuel\b/i, /\bAide-mémoire\b/i],
      'Standard': [/\bNormes?\b/i, /\bStandards?\b/i],
    },
    de: {
      'Law': [/\bGesetz\s+(?:über|betreffend)/i, /\bKiBe[G|V]\b/],
      'Regulation': [/\bVerordnung\s+(?:über|betreffend)/i, /\bReglement\s+(?:über|betreffend)/i],
      'Directive': [/\bWeisungen?\s+(?:über|betreffend)/i, /\bRichtlinien?\b/i],
      'Guideline': [/\bLeitfaden\b/i, /\bHandbuch\b/i, /\bMerkblatt\b/i],
      'Standard': [/\bNormen?\b/i, /\bStandards?\b/i],
    },
    it: {
      'Law': [/\bLegge\s+(?:federale\s+)?su[l]?/i],
      'Regulation': [/\bOrdinanza\s+su[l]?/i, /\bRegolamento\s+su[l]?/i],
      'Directive': [/\bDirettive?\s+(?:su|concernente)/i],
      'Guideline': [/\bGuida\b/i, /\bManuale\b/i],
      'Standard': [/\bNorme?\b/i, /\bStandard\b/i],
    },
  },
};
```

### 4.6 Crawler Scheduler

```typescript
// api/src/crawler/crawler.scheduler.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlerService } from './crawler.service';

@Injectable()
export class CrawlerScheduler implements OnModuleInit {
  private readonly logger = new Logger(CrawlerScheduler.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private crawler: CrawlerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Crawler scheduler initialized');
  }

  // Run every day at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduledCrawls() {
    if (this.isRunning) {
      this.logger.warn('Crawler already running, skipping scheduled run');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled crawl run');

    try {
      // Find sources due for crawling
      const dueSources = await this.prisma.cantonSource.findMany({
        where: {
          isActive: true,
          OR: [
            { nextCrawlAt: null },
            { nextCrawlAt: { lte: new Date() } },
          ],
        },
        orderBy: { nextCrawlAt: 'asc' },
        take: 10, // Process max 10 sources per run
      });

      this.logger.log(`Found ${dueSources.length} sources due for crawling`);

      for (const source of dueSources) {
        try {
          this.logger.log(`Crawling source: ${source.label} (ID: ${source.id})`);
          const results = await this.crawler.crawlSource(source.id);
          this.logger.log(`Source ${source.id} results: ${JSON.stringify(results)}`);
        } catch (error) {
          this.logger.error(`Failed to crawl source ${source.id}: ${error.message}`);
        }

        // Rate limiting: 30 seconds between sources (separate from 500ms per-document delay)
        // This ensures we don't overwhelm any single canton server when processing multiple sources
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } finally {
      this.isRunning = false;
      this.logger.log('Scheduled crawl run completed');
    }
  }

  // Manual trigger for admin
  async triggerCrawl(sourceId: number): Promise<any> {
    return this.crawler.crawlSource(sourceId);
  }
}
```

---

## 5. Admin Dashboard Extensions

### 5.1 New Admin Routes

Add to `admin/src/App.tsx`:

```typescript
// New routes for policy management
<Route path="/admin/cantons" element={<CantonsPage />} />
<Route path="/admin/cantons/:code" element={<CantonDetailPage />} />
<Route path="/admin/policies/review" element={<PolicyReviewPage />} />
```

### 5.2 Canton Sources Management Page

```typescript
// admin/src/pages/Cantons.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const CantonsPage: React.FC = () => {
  const [cantons, setCantons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCantons();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Canton Policy Sources</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cantons.map(canton => (
          <Link 
            key={canton.code}
            to={`/admin/cantons/${canton.code}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{canton.name}</h3>
                <p className="text-sm text-gray-500">{canton.code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{canton.sourcesCount} sources</p>
                <p className="text-sm text-gray-500">{canton.documentsCount} docs</p>
              </div>
            </div>
            {canton.pendingReview > 0 && (
              <span className="mt-2 inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                {canton.pendingReview} pending review
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};
```

### 5.3 Canton Detail Page with Source Management

```typescript
// admin/src/pages/CantonDetail.tsx

const CantonDetailPage: React.FC = () => {
  const { code } = useParams();
  const [canton, setCanton] = useState(null);
  const [sources, setSources] = useState([]);
  const [showAddSource, setShowAddSource] = useState(false);

  const handleTriggerCrawl = async (sourceId: number) => {
    if (!confirm('Trigger crawl for this source now?')) return;
    
    try {
      await api.post(`/admin/crawler/trigger/${sourceId}`);
      toast.success('Crawl triggered successfully');
      fetchSources();
    } catch (error) {
      toast.error('Failed to trigger crawl');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{canton?.name}</h1>
          <p className="text-gray-500">Code: {canton?.code} | Default language: {canton?.defaultLang}</p>
        </div>
        <button 
          onClick={() => setShowAddSource(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Source
        </button>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Label</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">URL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Last Crawl</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sources.map(source => (
              <tr key={source.id}>
                <td className="px-4 py-3">{source.label}</td>
                <td className="px-4 py-3">
                  <a href={source.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline text-sm truncate max-w-xs block">
                    {source.url}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {source.sourceType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={source.lastCrawlStatus} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {source.lastCrawlAt ? formatDate(source.lastCrawlAt) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button onClick={() => handleTriggerCrawl(source.id)} className="text-blue-600 hover:underline text-sm">
                      Crawl Now
                    </button>
                    <button onClick={() => handleEdit(source)} className="text-gray-600 hover:underline text-sm">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddSource && (
        <AddSourceModal 
          cantonId={canton.id}
          onClose={() => setShowAddSource(false)}
          onSuccess={fetchSources}
        />
      )}
    </div>
  );
};
```

### 5.4 Policy Review Queue Page

```typescript
// admin/src/pages/PolicyReview.tsx

const PolicyReviewPage: React.FC = () => {
  const [policies, setPolicies] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending_review',
    canton: '',
    hasChanges: false,
  });
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const handleApprove = async (assetId: string, updates: any) => {
    try {
      await api.patch(`/content/state-policies/${assetId}`, {
        ...updates,
        status: 'Published',
        crawlStatus: 'approved',
      });
      toast.success('Policy approved and published');
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error) {
      toast.error('Failed to approve policy');
    }
  };

  const handleReject = async (assetId: string, reason: string) => {
    try {
      await api.patch(`/content/state-policies/${assetId}`, {
        crawlStatus: 'rejected',
        status: 'Archived',
      });
      toast.success('Policy rejected');
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error) {
      toast.error('Failed to reject policy');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Policy Review Queue</h1>
        <div className="flex space-x-4">
          <select 
            value={filters.canton}
            onChange={e => setFilters({...filters, canton: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="">All Cantons</option>
            {Object.entries(CANTON_CODES).map(([code, name]) => (
              <option key={code} value={name}>{name} ({code})</option>
            ))}
          </select>
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={filters.hasChanges}
              onChange={e => setFilters({...filters, hasChanges: e.target.checked})}
              className="mr-2"
            />
            Changed only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy List */}
        <div className="space-y-4">
          {policies.map(policy => (
            <PolicyCard 
              key={policy.id}
              policy={policy}
              isSelected={selectedPolicy?.id === policy.id}
              onClick={() => setSelectedPolicy(policy)}
            />
          ))}
        </div>

        {/* Review Panel */}
        {selectedPolicy && (
          <PolicyReviewPanel
            policy={selectedPolicy}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={() => setSelectedPolicy(null)}
          />
        )}
      </div>
    </div>
  );
};

/** Type-safe interface for state policy assets in review */
interface StatePolicyAsset {
  id: string;
  title: string;
  contentCategory: string;
  policyType: string;
  tags?: string[];
  contentPreview?: string;
  officialUrl?: string;
  externalLink: string;
  region?: string;
  country?: string;
  previousVersion?: { contentText?: string };
  currentContentText?: string;
}

/** Type-safe interface for policy review form updates */
interface PolicyReviewFormData {
  title: string;
  contentCategory: string;
  policyType: string;
  tags: string[];
  contentPreview: string;
}

const PolicyReviewPanel: React.FC<{
  policy: StatePolicyAsset;
  onApprove: (id: string, updates: PolicyReviewFormData) => void;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}> = ({ policy, onApprove, onReject, onClose }) => {
  const [form, setForm] = useState({
    title: policy.title,
    contentCategory: policy.contentCategory,
    policyType: policy.policyType,
    tags: policy.tags || [],
    contentPreview: policy.contentPreview || '',
  });

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Review Policy</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
      </div>

      {/* Official URL - prominent display */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800 font-medium">Official Source:</p>
        <a 
          href={policy.officialUrl || policy.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {policy.officialUrl || policy.externalLink}
        </a>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={form.contentCategory}
            onChange={e => setForm({...form, contentCategory: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            {POLICY_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Document Type</label>
          <select
            value={form.policyType}
            onChange={e => setForm({...form, policyType: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            {['Law', 'Regulation', 'Directive', 'Guideline', 'Standard'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Summary (for users)</label>
          <textarea
            value={form.contentPreview}
            onChange={e => setForm({...form, contentPreview: e.target.value})}
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="Brief description of this document..."
          />
        </div>

        {/* Version diff (if available) */}
        {policy.previousVersion && (
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Changes Detected</p>
            <DiffViewer 
              previous={policy.previousVersion.contentText?.slice(0, 500)}
              current={policy.currentContentText?.slice(0, 500)}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 mt-6">
        <button
          onClick={() => onApprove(policy.id, form)}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Approve & Publish
        </button>
        <button
          onClick={() => {
            const reason = prompt('Reason for rejection:');
            if (reason) onReject(policy.id, reason);
          }}
          className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Reject
        </button>
      </div>
    </div>
  );
};
```

---

## 6. API Extensions

### 6.1 Admin Crawler Endpoints

Add to new controller `api/src/crawler/crawler.controller.ts`:

```typescript
@Controller('admin/crawler')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class CrawlerController {
  constructor(
    private crawlerScheduler: CrawlerScheduler,
    private prisma: PrismaService,
  ) {}

  // Trigger manual crawl with input validation
  @Post('trigger/:sourceId')
  async triggerCrawl(@Param('sourceId') sourceId: string) {
    // Input validation to prevent 500 errors from invalid input
    const id = parseInt(sourceId, 10);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException(`Invalid sourceId: '${sourceId}'. Must be a positive integer.`);
    }

    const results = await this.crawlerScheduler.triggerCrawl(id);
    return { success: true, data: results };
  }

  // Get all cantons with stats
  @Get('cantons')
  async getCantons() {
    const cantons = await this.prisma.canton.findMany({
      include: {
        _count: {
          select: { sources: true },
        },
      },
    });

    // Get document counts per canton
    const docCounts = await this.prisma.asset.groupBy({
      by: ['region'],
      where: { category: 'STATE_POLICY' },
      _count: true,
    });

    const pendingCounts = await this.prisma.asset.groupBy({
      by: ['region'],
      where: { category: 'STATE_POLICY', crawlStatus: 'pending_review' },
      _count: true,
    });

    return cantons.map(canton => ({
      ...canton,
      sourcesCount: canton._count.sources,
      documentsCount: docCounts.find(d => d.region === canton.name)?._count || 0,
      pendingReview: pendingCounts.find(p => p.region === canton.name)?._count || 0,
    }));
  }

  // Get sources for a canton
  @Get('cantons/:code/sources')
  async getCantonSources(@Param('code') code: string) {
    return this.prisma.cantonSource.findMany({
      where: { canton: { code } },
      orderBy: { label: 'asc' },
    });
  }

  // CRUD for sources
  @Post('sources')
  async createSource(@Body() dto: CreateSourceDto) {
    return this.prisma.cantonSource.create({ data: dto });
  }

  @Patch('sources/:id')
  async updateSource(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.prisma.cantonSource.update({
      where: { id: parseInt(id) },
      data: dto,
    });
  }

  // Get review queue
  @Get('review-queue')
  async getReviewQueue(@Query() query: ReviewQueueQueryDto) {
    const where: any = {
      category: 'STATE_POLICY',
      crawlStatus: 'pending_review',
    };

    if (query.canton) {
      where.region = query.canton;
    }

    return this.prisma.asset.findMany({
      where,
      orderBy: { lastCrawledAt: 'desc' },
      take: query.limit || 50,
    });
  }

  // Crawler health stats
  @Get('health')
  async getCrawlerHealth() {
    const [totalSources, activeSources, failedSources, pendingDocs] = await Promise.all([
      this.prisma.cantonSource.count(),
      this.prisma.cantonSource.count({ where: { isActive: true } }),
      this.prisma.cantonSource.count({ where: { lastCrawlStatus: 'failed' } }),
      this.prisma.asset.count({ where: { category: 'STATE_POLICY', crawlStatus: 'pending_review' } }),
    ]);

    const recentCrawls = await this.prisma.cantonSource.findMany({
      where: { lastCrawlAt: { not: null } },
      orderBy: { lastCrawlAt: 'desc' },
      take: 10,
      select: {
        id: true,
        label: true,
        lastCrawlAt: true,
        lastCrawlStatus: true,
        lastCrawlError: true,
      },
    });

    return {
      totalSources,
      activeSources,
      failedSources,
      pendingReviewCount: pendingDocs,
      recentCrawls,
    };
  }
}
```

### 6.2 Extended Public State Policies Endpoints

Add to existing `api/src/content/content.controller.ts`:

```typescript
// Add these endpoints to existing ContentController

// Get canton overview with document counts
@Get('state-policies/cantons')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.FOUNDATION, UserRole.PARENT, UserRole.PRODUCT_SUPPLIER)
async getCantonOverview() {
  const cantons = await this.prisma.canton.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const docCounts = await this.prisma.asset.groupBy({
    by: ['region'],
    where: { 
      category: 'STATE_POLICY',
      status: 'Published',
    },
    _count: true,
  });

  const lastUpdates = await this.prisma.asset.groupBy({
    by: ['region'],
    where: { category: 'STATE_POLICY', status: 'Published' },
    _max: { updatedAt: true },
  });

  return {
    success: true,
    data: cantons.map(canton => ({
      code: canton.code,
      name: canton.name,
      documentsCount: docCounts.find(d => d.region === canton.name)?._count || 0,
      lastUpdatedAt: lastUpdates.find(u => u.region === canton.name)?._max?.updatedAt,
    })),
  };
}

// Get single policy with full details
@Get('state-policies/:id')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR, UserRole.FOUNDATION, UserRole.PARENT, UserRole.PRODUCT_SUPPLIER)
async getStatePolicyById(@Param('id') id: string, @Query('lang') lang?: string) {
  const policy = await this.prisma.asset.findFirst({
    where: { id, category: 'STATE_POLICY' },
  });

  if (!policy) {
    throw new NotFoundException('Policy not found');
  }

  // Apply translations if needed
  let transformed = this.transformStatePolicyAsset(policy);
  if (lang && lang !== 'en') {
    const translations = await this.translationService.resolveEntity(
      'state_policy',
      id,
      ['title', 'description', 'content_preview'],
      lang,
    );
    transformed = {
      ...transformed,
      title: translations.title || transformed.title,
      description: translations.description || transformed.description,
      contentPreview: translations.content_preview || transformed.contentPreview,
    };
  }

  return { success: true, data: transformed };
}

// Get available filter options
@Get('state-policies/filters')
async getStatePolicyFilters() {
  const [categories, regions, types] = await Promise.all([
    this.prisma.asset.findMany({
      where: { category: 'STATE_POLICY', status: 'Published' },
      distinct: ['contentCategory'],
      select: { contentCategory: true },
    }),
    this.prisma.asset.findMany({
      where: { category: 'STATE_POLICY', status: 'Published' },
      distinct: ['region'],
      select: { region: true },
    }),
    this.prisma.asset.findMany({
      where: { category: 'STATE_POLICY', status: 'Published' },
      distinct: ['policyType'],
      select: { policyType: true },
    }),
  ]);

  return {
    success: true,
    data: {
      categories: categories.map(c => c.contentCategory).filter(Boolean),
      regions: regions.map(r => r.region).filter(Boolean),
      policyTypes: types.map(t => t.policyType).filter(Boolean),
    },
  };
}
```

---

## 7. Frontend UI Enhancements

### 7.1 Update StatePoliciesPage for Canton Navigation

Modify existing `frontend/pages/StatePoliciesPage.tsx`:

```typescript
// Add canton overview section to existing page

const StatePoliciesPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common']);
  const [cantonOverview, setCantonOverview] = useState<CantonStats[]>([]);
  const [selectedCanton, setSelectedCanton] = useState<string | null>(null);
  // ... existing state ...

  // Fetch canton overview
  useEffect(() => {
    const fetchCantonOverview = async () => {
      const response = await authenticatedRequest('/content/state-policies/cantons');
      if (response.success) {
        setCantonOverview(response.data);
      }
    };
    fetchCantonOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Legal Disclaimer - Always visible */}
      <PolicyDisclaimer />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-swiss-charcoal">
            {t('content:statePolicies.title', 'Cantonal Policies & Regulations')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('content:statePolicies.subtitle', 'Official daycare policies from Swiss cantons')}
          </p>
        </div>
        {isAdminOrSuperAdmin && (
          <Button variant="secondary" leftIcon={ShieldExclamationIcon} onClick={() => setIsAlertModalOpen(true)}>
            {t('content:statePolicies.manageAlerts', 'Manage Alerts')}
          </Button>
        )}
      </div>

      {/* Active Alerts */}
      {activeGlobalAlerts.map(alert => (
        <AlertBanner key={alert.id} alert={alert} />
      ))}

      {/* Canton Overview Grid - NEW */}
      <section aria-labelledby="canton-overview">
        <h2 id="canton-overview" className="text-xl font-semibold mb-4">
          {t('content:statePolicies.selectCanton', 'Select a Canton')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <CantonCard
            code="All"
            name={t('common:all', 'All Cantons')}
            count={policyDocs.length}
            isSelected={!selectedCanton}
            onClick={() => setSelectedCanton(null)}
          />
          {cantonOverview.map(canton => (
            <CantonCard
              key={canton.code}
              code={canton.code}
              name={canton.name}
              count={canton.documentsCount}
              lastUpdated={canton.lastUpdatedAt}
              isSelected={selectedCanton === canton.name}
              onClick={() => setSelectedCanton(canton.name)}
            />
          ))}
        </div>
      </section>

      {/* Filters */}
      <FilterSection 
        filterCanton={selectedCanton || filterCanton}
        setFilterCanton={(canton) => {
          setSelectedCanton(canton === 'All' ? null : canton);
          setFilterCanton(canton);
        }}
        // ... other filter props
      />

      {/* Policy Categories */}
      <PolicyCategoriesGrid 
        categories={categoriesWithCounts}
        selectedCategory={filterCategory}
        onSelectCategory={setFilterCategory}
      />

      {/* Policy Documents List */}
      <PolicyDocumentsList 
        documents={filteredDocs}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />

      {/* ... rest of existing JSX ... */}
    </div>
  );
};
```

### 7.2 Legal Disclaimer Component

```typescript
// frontend/components/shared/PolicyDisclaimer.tsx

import React, { useState } from 'react';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface PolicyDisclaimerProps {
  variant?: 'full' | 'compact';
}

export const PolicyDisclaimer: React.FC<PolicyDisclaimerProps> = ({ variant = 'full' }) => {
  const { t } = useTranslation('content');
  const [isExpanded, setIsExpanded] = useState(variant === 'full');

  const disclaimerText = t('statePolicies.disclaimer', 
    `All policies and documents listed here are sourced directly from official cantonal 
    and federal websites. ProCrèche does not create, modify or guarantee the legal 
    validity of these documents and cannot be held liable for their content or for any 
    changes made by the issuing authorities. Always refer to the official source for 
    the latest version.`
  );

  if (variant === 'compact') {
    return (
      <div 
        className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r"
        role="note"
        aria-label={t('statePolicies.legalNotice', 'Legal Notice')}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={isExpanded}
        >
          <span className="flex items-center text-amber-800 font-medium text-sm">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            {t('statePolicies.legalNotice', 'Legal Notice')}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-amber-600" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-amber-600" />
          )}
        </button>
        {isExpanded && (
          <p className="mt-2 text-sm text-amber-700">{disclaimerText}</p>
        )}
      </div>
    );
  }

  return (
    <div 
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
      role="note"
      aria-label={t('statePolicies.legalNotice', 'Legal Notice')}
    >
      <div className="flex items-start">
        <InformationCircleIcon className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-800 mb-1">
            {t('statePolicies.legalNotice', 'Legal Notice')}
          </h3>
          <p className="text-sm text-amber-700">{disclaimerText}</p>
        </div>
      </div>
    </div>
  );
};
```

### 7.3 Canton Card Component (Mobile-Optimized)

```typescript
// frontend/components/shared/CantonCard.tsx

import React from 'react';
import { format } from 'date-fns';

interface CantonCardProps {
  code: string;
  name: string;
  count: number;
  lastUpdated?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const CantonCard: React.FC<CantonCardProps> = ({
  code,
  name,
  count,
  lastUpdated,
  isSelected,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-lg border-2 text-left transition-all
        focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2
        ${isSelected 
          ? 'border-swiss-teal bg-swiss-teal/10' 
          : 'border-gray-200 hover:border-swiss-teal/50 hover:bg-gray-50'
        }
      `}
      aria-pressed={isSelected}
    >
      {/* Canton Code Badge */}
      <div className={`
        inline-block px-2 py-0.5 rounded text-xs font-bold mb-1
        ${isSelected ? 'bg-swiss-teal text-white' : 'bg-gray-200 text-gray-700'}
      `}>
        {code}
      </div>
      
      {/* Canton Name - truncated on mobile */}
      <p className="font-medium text-sm text-gray-900 truncate" title={name}>
        {name}
      </p>
      
      {/* Document Count */}
      <p className="text-xs text-gray-500 mt-1">
        {count} {count === 1 ? 'document' : 'documents'}
      </p>
      
      {/* Last Updated - hidden on mobile for space */}
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
          Updated {format(new Date(lastUpdated), 'MMM d')}
        </p>
      )}
    </button>
  );
};
```

### 7.4 Mobile UX Improvements

```typescript
// frontend/components/shared/PolicyDocumentCard.tsx

// Updated for better mobile experience
const PolicyDocumentCard: React.FC<PolicyDocumentCardProps> = ({ doc, onPreview }) => {
  const { t } = useTranslation(['content', 'common']);

  return (
    <Card className="flex flex-col h-full" hoverEffect>
      <div className="p-4 sm:p-5 flex-grow">
        {/* Critical Badge */}
        {doc.isCritical && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-r mb-3 text-xs flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{t('content:statePolicies.criticalUpdate')}</span>
          </div>
        )}

        {/* Title - larger tap target on mobile */}
        <h3 className="text-base sm:text-lg font-semibold text-swiss-charcoal mb-2 line-clamp-2">
          {doc.title}
        </h3>

        {/* Meta info - stacked on mobile */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {doc.region}
          </span>
          {doc.policyType && (
            <span className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-1 rounded">
              {doc.policyType}
            </span>
          )}
        </div>

        {/* Description - shorter on mobile */}
        <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 mb-3">
          {doc.contentPreview}
        </p>

        {/* Date info - simplified on mobile */}
        <div className="text-xs text-gray-500 space-y-1">
          <p className="flex items-center">
            <CalendarDaysIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">
              {t('content:statePolicies.lastUpdated')}: {format(new Date(doc.lastUpdatedDate), 'dd.MM.yyyy')}
            </span>
          </p>
        </div>

        {/* Tags - scrollable on mobile */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="mt-3 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
            <div className="flex gap-1.5 min-w-max">
              {doc.tags.slice(0, 4).map(tag => (
                <span 
                  key={tag} 
                  className="text-xs bg-swiss-teal/10 text-swiss-teal px-2 py-0.5 rounded-full whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
              {doc.tags.length > 4 && (
                <span className="text-xs text-gray-400">+{doc.tags.length - 4}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions - full width buttons on mobile */}
      <div className="bg-gray-50 px-4 sm:px-5 py-3 mt-auto border-t">
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {doc.externalLink && (
            <a
              href={doc.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center justify-center px-4 py-2.5 sm:py-2
                bg-swiss-teal text-white rounded-lg
                hover:bg-swiss-teal/90 transition-colors
                text-sm font-medium
                w-full sm:w-auto
              "
            >
              <ExternalLinkIcon className="w-4 h-4 mr-2" />
              {t('content:statePolicies.viewOnOfficialSite', 'View on Official Site')}
            </a>
          )}
          {doc.fileUrl && (
            <button
              onClick={() => onPreview(doc)}
              className="
                inline-flex items-center justify-center px-4 py-2.5 sm:py-2
                bg-gray-200 text-gray-700 rounded-lg
                hover:bg-gray-300 transition-colors
                text-sm font-medium
                w-full sm:w-auto
              "
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              {t('common:preview', 'Preview')}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
```

### 7.5 CSS Utilities for Mobile

Add to `frontend/src/index.css`:

```css
/* Hide scrollbar but keep functionality */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Touch-friendly tap targets */
@media (max-width: 640px) {
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Safe area padding for mobile browsers */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

---

## 8. Monitoring & Health Checks

### 8.1 Extend System Monitoring Dashboard

Add to existing admin System Monitor page:

```typescript
// Add crawler health section to admin/src/pages/SystemMonitor.tsx

const CrawlerHealthSection: React.FC = () => {
  const [health, setHealth] = useState<CrawlerHealth | null>(null);

  useEffect(() => {
    fetchCrawlerHealth();
    const interval = setInterval(fetchCrawlerHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Policy Crawler Status</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Sources" value={health?.activeSources || 0} />
        <StatCard label="Failed Sources" value={health?.failedSources || 0} variant="danger" />
        <StatCard label="Pending Review" value={health?.pendingReviewCount || 0} variant="warning" />
        <StatCard label="Total Sources" value={health?.totalSources || 0} />
      </div>

      <h4 className="font-medium mb-2">Recent Crawls</h4>
      <div className="space-y-2">
        {health?.recentCrawls.map(crawl => (
          <div key={crawl.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">{crawl.label}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={crawl.lastCrawlStatus} />
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(crawl.lastCrawlAt))} ago
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### 8.2 Alerting for Stale Sources

Add to `CrawlerScheduler`:

```typescript
// Check for stale sources daily
@Cron(CronExpression.EVERY_DAY_AT_6AM)
async checkStaleSources() {
  const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  const staleSources = await this.prisma.cantonSource.findMany({
    where: {
      isActive: true,
      OR: [
        { lastCrawlAt: null },
        { lastCrawlAt: { lt: staleThreshold } },
      ],
    },
    include: { canton: true },
  });

  if (staleSources.length > 0) {
    // Create system alert
    await this.prisma.systemAlert.create({
      data: {
        alertType: 'warning',
        title: 'Stale Policy Sources Detected',
        message: `${staleSources.length} source(s) haven't been crawled in 30+ days: ${staleSources.map(s => s.label).join(', ')}`,
        severity: 'medium',
      },
    });

    this.logger.warn(`Stale sources detected: ${staleSources.map(s => s.id).join(', ')}`);
  }
}
```

---

## 9. Rollout Plan

### Phase 1: Database & Core Infrastructure (Week 1)
- [ ] Create Prisma migration for new tables (Canton, CantonSource, PolicyCrawlHistory)
- [ ] Add new fields to Asset model
- [ ] Create canton seed data (all 26 cantons + Federal)
- [ ] Add canton code mapping to types package

### Phase 2: Crawler Service (Week 2)
- [ ] Implement CrawlerModule with all services
- [ ] Implement PDF parser with pdfjs-dist
- [ ] Implement HTML parser with Cheerio
- [ ] Implement classifier with keyword config
- [ ] Add unit tests for classifier
- [ ] Manual testing with 2-3 pilot cantons (VD, ZH, TI)

### Phase 3: Admin UI (Week 3)
- [ ] Canton sources management page
- [ ] Policy review queue page
- [ ] Crawler health dashboard section
- [ ] Bulk approve/reject functionality

### Phase 4: Frontend Enhancements (Week 4)
- [ ] Canton overview grid
- [ ] Legal disclaimer component
- [ ] Mobile UX improvements
- [ ] Translation keys for new UI elements

### Phase 5: Testing & Launch (Week 5)
- [ ] Enable scheduled crawls
- [ ] Add sources for all 26 cantons
- [ ] Admin training on review workflow
- [ ] Monitor classifier accuracy and tune thresholds
- [ ] Performance testing with full dataset

---

## 10. Dependencies to Install

```bash
# API
cd api
pnpm add cheerio          # HTML parsing (required)
pnpm add pdfjs-dist       # PDF parsing (optional, for low-confidence docs)

# Optional: Playwright for JS-heavy sites (only if needed)
# pnpm add playwright
```

**Important Notes:**

1. **Node.js Version**: The crawler uses the native `fetch()` API which requires **Node.js 18.0.0 or later**. Verify your `package.json` has `"engines": { "node": ">=18.0.0" }`. If supporting older Node.js versions, use `node-fetch` package instead.

2. **PDF Parsing**: The `pdfjs-dist` dependency is only used for ~10% of documents where metadata-based classification has low confidence. Most change detection uses HTTP headers (ETag, Last-Modified) via HEAD requests.

3. **Rate Limiting Strategy**:
   - **Per-document**: 500ms delay between individual document checks (HEAD requests are fast)
   - **Per-source**: 30 seconds delay between different source pages to avoid overwhelming any single canton server
   - **Per-run**: Maximum 10 sources processed per scheduled crawl run

---

## 11. Key Integration Points

| Existing Component | Integration |
|-------------------|-------------|
| `Asset` model | Add crawler fields; use `category: 'STATE_POLICY'` |
| `ContentService` | No changes; crawler creates Assets via Prisma directly |
| `ContentController` | Add canton overview and filters endpoints |
| `TranslationService` | Crawler-created Assets auto-trigger translation |
| `BullMQ` | Optional: use for heavy crawl jobs if needed |
| `@nestjs/schedule` | Use for daily crawl scheduling |
| `StatePoliciesPage` | Extend with canton navigation UI |
| `PolicyAlert` | No changes; existing alert system works |

---

## 12. Security Considerations

1. **URL Validation**: Only allow URLs from whitelisted domains (cantonal/federal)
2. **Rate Limiting**: 2s delay between requests, max 10 sources per scheduled run
3. **Content Size Limits**: Max 50MB PDF, max 50KB stored text per document
4. **Admin-Only**: All crawler management restricted to ADMIN/SUPER_ADMIN
5. **No User Downloads from ProCrèche**: External links only, `rel="noopener noreferrer"`
6. **Disclaimer**: Legally required on all policy pages

---

## Summary of Changes vs Original Plan

| Original Plan | Revised Approach |
|--------------|------------------|
| New `PolicyDocument` table | Use existing `Asset` with `category: 'STATE_POLICY'` |
| New `PolicyDocumentVersion` table | Use simpler `PolicyCrawlHistory` linked to Asset |
| New API routes `/api/policies/*` | Extend existing `/content/state-policies/*` |
| New frontend pages | Extend existing `StatePoliciesPage` |
| Custom job queue | Use existing BullMQ + @nestjs/schedule |
| Canton full names in DB | Canton code mapping + localized names |
| Parse all PDFs for classification | **Metadata-first**: Parse only ~10% of PDFs |
| Download PDFs for change detection | **HTTP headers**: Use ETag/Last-Modified via HEAD requests |

---

## Appendix: Metadata-First Crawling Strategy

### Why We Don't Parse All PDFs

| Concern | Full PDF Parsing | Metadata + HEAD Requests |
|---------|-----------------|-------------------------|
| **Bandwidth** | ~50MB per PDF × 1000s of docs | ~1KB per HEAD request |
| **Speed** | 5-10 seconds per PDF | <100ms per document |
| **Server load on cantons** | High (full downloads) | Minimal (HEAD only) |
| **Classification accuracy** | 95%+ | 85-90% (sufficient for filtering) |
| **Change detection reliability** | High (content hash) | High (ETag/Last-Modified) |
| **Complexity** | High | Low |

### What We Use Instead

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CLASSIFICATION SOURCES                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Anchor text: "Directives sur l'accueil de jour"    ✓ High  │
│  2. URL path: "/themes/accueil-prescolaire/loi.pdf"    ✓ High  │
│  3. Section heading: "Bases légales - Petite enfance"  ✓ High  │
│  4. Page context: Link found in daycare section        ✓ Med   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CHANGE DETECTION (HEAD request)              │
├─────────────────────────────────────────────────────────────────┤
│  ETag: "abc123def456"                  → Primary hash           │
│  Last-Modified: "Wed, 21 Oct 2024..."  → Fallback               │
│  Content-Length: 2458934               → Secondary signal       │
└─────────────────────────────────────────────────────────────────┘
```

### When We DO Parse PDFs (~10% of cases)

1. **Low classification confidence** (<50%) - Need content to verify relevance
2. **Admin requests extraction** - "Extract text" button in review UI
3. **Auto-summary generation** - Extract first 300 chars for preview (optional)

### Benefits

- **Respectful**: Minimal load on cantonal government servers
- **Fast**: Process 100+ documents per minute
- **Cost-effective**: Minimal bandwidth and compute
- **Accurate enough**: 85-90% accuracy is fine for filtering; admins review anyway
