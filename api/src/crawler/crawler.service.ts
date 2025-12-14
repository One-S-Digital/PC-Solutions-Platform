import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlParserService, CandidateDocument } from './parsers/html-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import { PlaywrightRendererService } from './parsers/playwright-renderer.service';
import { ClassifierService } from './classifier/classifier.service';
import { createHash } from 'crypto';
import { AssetKind } from '@prisma/client';

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
  private systemUserId: string | null = null;

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
    private playwrightRenderer: PlaywrightRendererService,
    private classifier: ClassifierService,
  ) {}

  /**
   * Get or create system user for crawler operations
   */
  private async getSystemUserId(): Promise<string> {
    if (this.systemUserId) {
      return this.systemUserId;
    }

    // Try to find existing system user (by special clerkId pattern)
    const systemUser = await this.prisma.appUser.findFirst({
      where: {
        clerkId: 'system_crawler',
      },
    });

    if (systemUser) {
      this.systemUserId = systemUser.id;
      return this.systemUserId;
    }

    // Create system user if not found
    const newSystemUser = await this.prisma.appUser.create({
      data: {
        clerkId: 'system_crawler',
        email: 'system@procreche.ch',
        role: 'SUPER_ADMIN',
      },
    });

    this.systemUserId = newSystemUser.id;
    return this.systemUserId;
  }

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
    const systemUserId = await this.getSystemUserId();
    
    const newAsset = await this.prisma.asset.create({
      data: {
        kind: AssetKind.DOCUMENT,
        category: 'STATE_POLICY',
        contentCategory: finalClassification.category,
        
        filename: this.extractFilename(candidate.url),
        publicUrl: '', // Not hosting the file
        storageKey: `crawler-${Date.now()}`,
        mimeType: candidate.isPdf ? 'application/pdf' : 'text/html',
        size: parseInt(headers.contentLength) || 0,
        uploadedById: systemUserId,
        
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
      return this.playwrightRenderer.fetchWithPlaywright(url);
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

