import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlParserService, CandidateDocument } from './parsers/html-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import { PlaywrightRendererService } from './parsers/playwright-renderer.service';
import { ClassifierService } from './classifier/classifier.service';
import { CLASSIFIER_CONFIG } from './classifier/classifier.config';
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

export interface CandidateScanResult {
  url: string;
  title: string;
  anchorText: string;
  sectionHeading?: string;
  isPdf: boolean;
  whitelisted: boolean;
  whitelistError?: string;
  classification?: {
    isDaycareRelated: boolean;
    confidence: number;
    category: string;
    docType: string;
    language: 'fr' | 'de' | 'en';
    topics: string[];
  };
  classifierSkipReason?: string;
}

export interface ScanSourceResult {
  sourceId: number;
  sourceLabel: string;
  sourceUrl: string;
  discovered: number;
  whitelisted: number;
  nonWhitelisted: number;
  pdfCount: number;
  daycareRelated: number;
  classifierSkipped: number;
  candidates: CandidateScanResult[];
}

/** Maximum file size for PDF downloads (50MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private systemUserId: string | null = null;
  private readonly DEFAULT_DEBUG_LIMIT = 10;

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

  private classifierSkipReason(classification: any): string {
    const debug = classification?._debug || {};
    return debug.negativePattern
      ? `negative pattern: "${debug.negativePattern}"`
      : `score ${debug.rawScore?.toFixed?.(1) || '0'} < threshold ${debug.threshold || CLASSIFIER_CONFIG.threshold}`;
  }

  /**
   * Scan a source page and return discovered candidate links + classification results.
   * This does NOT create/update any assets.
   */
  async scanSource(sourceId: number): Promise<ScanSourceResult> {
    const source = await this.prisma.cantonSource.findUnique({
      where: { id: sourceId },
      include: { canton: true },
    });

    if (!source || !source.isActive) {
      throw new Error(`Source ${sourceId} not found or inactive`);
    }

    this.logger.log(`Scanning source: ${source.label} (${source.url})`);
    this.validateUrl(source.url);

    const html = await this.fetchPage(source.url, source.renderType === 'dynamic');
    const extracted = this.htmlParser.extractLinks(html, source.url, source.cssSelector);

    const candidates: CandidateScanResult[] = extracted.map(candidate => {
      let whitelisted = true;
      let whitelistError: string | undefined;
      try {
        this.validateUrl(candidate.url);
      } catch (e: any) {
        whitelisted = false;
        whitelistError = e?.message || 'Not whitelisted';
      }

      if (!whitelisted) {
        return {
          url: candidate.url,
          title: candidate.title,
          anchorText: candidate.anchorText,
          sectionHeading: candidate.sectionHeading,
          isPdf: candidate.isPdf,
          whitelisted,
          whitelistError,
        };
      }

      const classification: any = this.classifier.classifyFromMetadata({
        anchorText: candidate.anchorText,
        url: candidate.url,
        sectionHeading: candidate.sectionHeading,
        defaultLang: source.canton.defaultLang,
      });

      const isDaycareRelated = Boolean(classification.isDaycareRelated);

      return {
        url: candidate.url,
        title: candidate.title,
        anchorText: candidate.anchorText,
        sectionHeading: candidate.sectionHeading,
        isPdf: candidate.isPdf,
        whitelisted,
        classification: {
          isDaycareRelated,
          confidence: classification.confidence,
          category: classification.category,
          docType: classification.docType,
          language: classification.language,
          topics: classification.topics,
        },
        classifierSkipReason: isDaycareRelated ? undefined : this.classifierSkipReason(classification),
      };
    });

    const whitelistedCount = candidates.filter(c => c.whitelisted).length;
    const nonWhitelistedCount = candidates.length - whitelistedCount;
    const pdfCount = candidates.filter(c => c.isPdf).length;
    const classifierSkipped = candidates.filter(c => c.whitelisted && c.classification && !c.classification.isDaycareRelated).length;
    const daycareRelated = candidates.filter(c => c.whitelisted && c.classification && c.classification.isDaycareRelated).length;

    return {
      sourceId: source.id,
      sourceLabel: source.label,
      sourceUrl: source.url,
      discovered: candidates.length,
      whitelisted: whitelistedCount,
      nonWhitelisted: nonWhitelistedCount,
      pdfCount,
      daycareRelated,
      classifierSkipped,
      candidates,
    };
  }

  /**
   * Ingest a list of URLs from a given source page into the review queue.
   * Fetches the source page to get consistent metadata (anchor text / PDF flag).
   */
  async ingestUrlsFromSource(
    sourceId: number,
    urls: string[],
    options?: { force?: boolean; queueUnchanged?: boolean },
  ): Promise<{
    requested: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    errors: Array<{ url: string; error: string }>;
    results: Array<{ url: string; outcome: 'created' | 'updated' | 'unchanged' | 'skipped' | 'error' }>;
  }> {
    const source = await this.prisma.cantonSource.findUnique({
      where: { id: sourceId },
      include: { canton: true },
    });

    if (!source || !source.isActive) {
      throw new Error(`Source ${sourceId} not found or inactive`);
    }

    // Fetch source page to get anchor text / pdf flag for requested URLs
    this.validateUrl(source.url);
    const html = await this.fetchPage(source.url, source.renderType === 'dynamic');
    const extracted = this.htmlParser.extractLinks(html, source.url, source.cssSelector);
    const byUrl = new Map<string, CandidateDocument>(extracted.map(c => [c.url, c]));

    const summary = {
      requested: urls.length,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      errors: [] as Array<{ url: string; error: string }>,
      results: [] as Array<{ url: string; outcome: 'created' | 'updated' | 'unchanged' | 'skipped' | 'error' }>,
    };

    for (const url of urls) {
      try {
        const candidate =
          byUrl.get(url) ||
          ({
            url,
            title: this.extractFilename(url),
            anchorText: this.extractFilename(url),
            isPdf: url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf?'),
          } as CandidateDocument);

        // SSRF prevention
        this.validateUrl(candidate.url);

        const outcome = await this.processCandidate(candidate, source as any, {
          force: Boolean(options?.force),
          queueUnchanged: Boolean(options?.queueUnchanged),
        });

        summary[outcome]++;
        summary.results.push({ url, outcome });
      } catch (e: any) {
        const error = e?.message || 'Unknown error';
        summary.errors.push({ url, error });
        summary.results.push({ url, outcome: 'error' });
      }
    }

    // Update source crawl status (manual ingest should count as a crawl)
    const totalProcessed = summary.created + summary.updated + summary.unchanged + summary.skipped;
    const status =
      summary.errors.length === 0
        ? 'success'
        : totalProcessed > 0
          ? 'partial'
          : 'failed';

    await this.prisma.cantonSource.update({
      where: { id: sourceId },
      data: {
        lastCrawlAt: new Date(),
        lastCrawlStatus: status,
        lastCrawlError: summary.errors.length > 0
          ? summary.errors.slice(0, 3).map(e => `${e.url}: ${e.error}`).join('; ')
          : null,
        nextCrawlAt:
          status === 'failed'
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : new Date(Date.now() + source.crawlFrequencyDays * 24 * 60 * 60 * 1000),
      },
    });

    return summary;
  }

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

  async crawlSource(
    sourceId: number,
    options?: { debug?: boolean; debugLimit?: number },
  ): Promise<{
    discovered: number;
    whitelisted: number;
    nonWhitelisted: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    errors: string[];
    debug?: {
      nonWhitelistedSamples: Array<{ url: string; reason: string }>;
      classifierSkippedSamples: Array<{ url: string; reason: string; anchorText: string; confidence: number }>;
    };
  }> {
    const source = await this.prisma.cantonSource.findUnique({
      where: { id: sourceId },
      include: { canton: true },
    });

    if (!source || !source.isActive) {
      throw new Error(`Source ${sourceId} not found or inactive`);
    }

    const debugEnabled = Boolean(options?.debug);
    const debugLimit = Math.max(
      1,
      Math.min(options?.debugLimit ?? this.DEFAULT_DEBUG_LIMIT, 50),
    );

    const results = { 
      discovered: 0,
      whitelisted: 0,
      nonWhitelisted: 0,
      created: 0, 
      updated: 0, 
      unchanged: 0,
      skipped: 0,
      errors: [] as string[],
      debug: debugEnabled
        ? {
            nonWhitelistedSamples: [] as Array<{ url: string; reason: string }>,
            classifierSkippedSamples: [] as Array<{
              url: string;
              reason: string;
              anchorText: string;
              confidence: number;
            }>,
          }
        : undefined,
    };

    try {
      // Step 1: Fetch and parse source page (only HTML page, not PDFs)
      this.logger.log(`Starting crawl for source: ${source.label} (${source.url})`);
      
      // Validate URL format before attempting fetch
      try {
        this.validateUrl(source.url);
        this.logger.debug(`URL validation passed for: ${source.url}`);
      } catch (validationError: any) {
        const errorMsg = `Invalid URL format: ${validationError.message}`;
        this.logger.error(errorMsg);
        await this.prisma.cantonSource.update({
          where: { id: sourceId },
          data: {
            lastCrawlAt: new Date(),
            lastCrawlStatus: 'failed',
            lastCrawlError: errorMsg,
            nextCrawlAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        throw new Error(errorMsg);
      }

      this.logger.debug(`Attempting to fetch page: ${source.url} (renderType: ${source.renderType})`);
      const html = await this.fetchPage(source.url, source.renderType === 'dynamic');
      const allCandidates = this.htmlParser.extractLinks(html, source.url, source.cssSelector);
      results.discovered = allCandidates.length;

      // Filter out candidates with non-whitelisted domains before processing
      const candidates = allCandidates.filter(candidate => {
        try {
          this.validateUrl(candidate.url);
          return true;
        } catch (error: any) {
          // Silently skip non-whitelisted domains (social media, external sites, etc.)
          const reason = error?.message || 'Non-whitelisted URL';
          this.logger.debug(`Skipping non-whitelisted URL: ${candidate.url} (${reason})`);

          if (debugEnabled && results.debug) {
            if (results.debug.nonWhitelistedSamples.length < debugLimit) {
              results.debug.nonWhitelistedSamples.push({ url: candidate.url, reason });
            }
          }
          return false;
        }
      });

      results.whitelisted = candidates.length;
      results.nonWhitelisted = Math.max(0, allCandidates.length - candidates.length);

      this.logger.log(
        `Source ${source.label}: Found ${allCandidates.length} candidate links, ` +
        `${results.whitelisted} whitelisted, ` +
        `${results.nonWhitelisted} non-whitelisted`
      );

      // Step 2: Process each candidate with rate limiting
      for (const candidate of candidates) {
        try {
          const result = await this.processCandidate(candidate, source, {
            debugEnabled,
            debugLimit,
            onClassifierSkip: (info) => {
              if (!results.debug) return;
              if (results.debug.classifierSkippedSamples.length >= debugLimit) return;
              results.debug.classifierSkippedSamples.push(info);
            },
          });
          results[result]++;
          
          // Per-document rate limit: 500ms between candidates
          // This is acceptable since we're mostly doing lightweight HEAD requests
          // (separate from 30s per-source delay in scheduler)
          await this.delay(500);
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          results.errors.push(`${candidate.url}: ${errorMsg}`);
          this.logger.error(`Failed to process ${candidate.url}: ${errorMsg}`);
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

      // Log summary statistics
      const totalProcessed = results.created + results.updated + results.unchanged + results.skipped;
      const successRate = totalProcessed > 0 
        ? ((results.created + results.updated + results.unchanged) / totalProcessed * 100).toFixed(1)
        : '0';
      this.logger.log(
        `Crawl summary for ${source.label}: ` +
        `Discovered: ${results.discovered}, ` +
        `Created: ${results.created}, ` +
        `Updated: ${results.updated}, ` +
        `Unchanged: ${results.unchanged}, ` +
        `Skipped: ${results.skipped}, ` +
        `Errors: ${results.errors.length}, ` +
        `Success rate: ${successRate}%`
      );

      return results;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error occurred';
      this.logger.error(`Crawl failed for source ${sourceId}: ${errorMsg}`);
      
      await this.prisma.cantonSource.update({
        where: { id: sourceId },
        data: {
          lastCrawlAt: new Date(),
          lastCrawlStatus: 'failed',
          lastCrawlError: errorMsg,
          nextCrawlAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Retry in 1 day
        },
      });
      throw error;
    }
  }

  private async processCandidate(
    candidate: CandidateDocument,
    source: CantonSourceWithCanton,
    options?: {
      force?: boolean;
      queueUnchanged?: boolean;
      debugEnabled?: boolean;
      debugLimit?: number;
      onClassifierSkip?: (info: {
        url: string;
        reason: string;
        anchorText: string;
        confidence: number;
      }) => void;
    },
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

    // Allow low-confidence PDFs to proceed to content-based reclassification
    const shouldAttemptPdfReclass = Boolean(candidate.isPdf) && classification.confidence < 0.5;

    // Skip if NOT daycare-related (unless forced or reclassifying a low-confidence PDF)
    if (!classification.isDaycareRelated) {
      const classifierReason = this.classifierSkipReason(classification as any);
      const topicsInfo = (classification as any)?._debug?.topicsFound?.length
        ? ` (topics: ${(classification as any)._debug.topicsFound.join(', ')})`
        : '';

      if (!options?.force && !shouldAttemptPdfReclass) {
        this.logger.debug(
          `Skipping ${candidate.url} - not daycare-related (${classifierReason}, confidence: ${classification.confidence.toFixed(2)}${topicsInfo}, anchor: "${candidate.anchorText}")`
        );

        if (options?.debugEnabled && options.onClassifierSkip) {
          options.onClassifierSkip({
            url: candidate.url,
            reason: `not daycare-related (${classifierReason})`,
            anchorText: candidate.anchorText,
            confidence: classification.confidence,
          });
        }
        return 'skipped';
      }

      if (options?.force) {
        this.logger.warn(
          `FORCING ingest for ${candidate.url} despite classifier (${classifierReason}, confidence: ${classification.confidence.toFixed(2)}${topicsInfo})`
        );
      } else {
        // We’ll attempt content-based reclassification before skipping
        this.logger.debug(
          `Low-confidence PDF ${candidate.url} failed metadata classifier (${classifierReason}, confidence: ${classification.confidence.toFixed(2)}${topicsInfo}); attempting PDF parse before skipping`
        );
      }
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
          data: {
            lastCrawledAt: new Date(),
            ...(options?.queueUnchanged ? { crawlStatus: 'pending_review' } : {}),
          },
        });

        if (options?.queueUnchanged) {
          await this.prisma.policyCrawlHistory.create({
            data: {
              assetId: existingAsset.id,
              sourceId: source.id,
              contentHash: changeHash,
              changeType: 'unchanged',
            },
          });
        }
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
    if (shouldAttemptPdfReclass) {
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

        if (!finalClassification.isDaycareRelated && !options?.force) {
          this.logger.debug(`After parsing, ${candidate.url} still not daycare-related - skipping`);
          if (options?.debugEnabled && options.onClassifierSkip) {
            options.onClassifierSkip({
              url: candidate.url,
              reason: 'not daycare-related after PDF parse',
              anchorText: candidate.anchorText,
              confidence: finalClassification.confidence,
            });
          }
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
   * Fetch with redirect validation.
   *
   * Security: validates *every* redirect hop against the SSRF allowlist.
   * This prevents an allowed URL from redirecting to a disallowed domain/IP.
   */
  private async fetchWithValidatedRedirects(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    maxRedirects = 5,
  ): Promise<Response> {
    let currentUrl = url;

    for (let i = 0; i <= maxRedirects; i++) {
      // SSRF prevention: validate URL before making request (and before each redirect hop)
      this.validateUrl(currentUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(currentUrl, {
          ...init,
          signal: controller.signal,
          redirect: 'manual',
        });

        // Handle redirects manually so we can validate each hop.
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            if (i === maxRedirects) {
              throw new Error(`Too many redirects (>${maxRedirects}) for URL: ${url}`);
            }

            const nextUrl = new URL(location, currentUrl).toString();
            currentUrl = nextUrl;
            continue;
          }
        }

        return response;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(`Too many redirects (>${maxRedirects}) for URL: ${url}`);
  }

  /**
   * Validates URL against whitelist to prevent SSRF attacks.
   * Only allows requests to official cantonal and federal domains.
   * @throws Error if domain is not whitelisted
   */
  public validateUrl(url: string): void {
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
    try {
      const response = await this.fetchWithValidatedRedirects(
        url,
        {
          method: 'HEAD',
          headers: {
            'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
          },
        },
        10000,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        etag: response.headers.get('etag') || '',
        lastModified: response.headers.get('last-modified') || '',
        contentLength: response.headers.get('content-length') || '0',
      };
    } finally {
      // no-op: timeout handled inside fetchWithValidatedRedirects
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
    if (useDynamic) {
      // Use Playwright for JS-heavy pages (implement separately)
      return this.playwrightRenderer.fetchWithPlaywright(url);
    }

    try {
      this.logger.debug(`Fetching URL: ${url}`);
      const response = await this.fetchWithValidatedRedirects(
        url,
        {
          headers: {
            'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        30000,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.debug(`Successfully fetched ${url}, content length: ${response.headers.get('content-length') || 'unknown'}`);
      return response.text();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error(`Request timeout for URL: ${url}`);
        throw new Error(`Request timeout after 30 seconds for URL: ${url}`);
      }
      if (error.cause?.code === 'ETIMEDOUT' || error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
        this.logger.error(`Network error for URL ${url}: ${error.cause.code} - ${error.cause.message}`);
        throw new Error(`Network error connecting to ${url}: ${error.cause.message} (${error.cause.code}). Please verify the URL is accessible and uses HTTPS.`);
      }
      this.logger.error(`Unexpected error fetching ${url}: ${error.message}`, error.stack);
      throw error;
    } finally {
      // no-op: timeout handled inside fetchWithValidatedRedirects
    }
  }

  private async fetchBuffer(url: string): Promise<Buffer> {
    try {
      const response = await this.fetchWithValidatedRedirects(
        url,
        {
          headers: {
            'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
          },
        },
        60000,
      );

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after 60 seconds for URL: ${url}`);
      }
      if (error.cause?.code === 'ETIMEDOUT' || error.cause?.code === 'ECONNREFUSED') {
        throw new Error(`Network error connecting to ${url}: ${error.cause.message}. Please verify the URL is accessible and uses HTTPS.`);
      }
      throw error;
    } finally {
      // no-op: timeout handled inside fetchWithValidatedRedirects
    }
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

  /**
   * Extract text from a PDF document for admin review.
   * This is a manual operation triggered by admins, not part of the automatic crawl process.
   * 
   * @param assetId The asset ID to extract text for
   * @returns The extracted text length and whether preview was updated
   * @throws Error if asset is not valid for extraction
   */
  async extractTextFromPdf(assetId: string): Promise<{ extractedLength: number; previewUpdated: boolean }> {
    // Validate asset exists and is STATE_POLICY
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }

    if (asset.category !== 'STATE_POLICY') {
      throw new Error(`Asset is not a STATE_POLICY. Category: ${asset.category}`);
    }

    if (asset.mimeType !== 'application/pdf') {
      throw new Error(`Asset is not a PDF. MIME type: ${asset.mimeType}`);
    }

    if (!asset.crawlSourceId) {
      throw new Error('Asset was not created by crawler (crawlSourceId is null)');
    }

    if (!asset.officialUrl) {
      throw new Error('Asset does not have an officialUrl to fetch from');
    }

    // Validate URL against SSRF whitelist
    this.validateUrl(asset.officialUrl);

    // Fetch PDF buffer
    this.logger.log(`Fetching PDF from ${asset.officialUrl} for text extraction`);
    const buffer = await this.fetchBuffer(asset.officialUrl);

    // Extract text using PdfParserService
    this.logger.log(`Extracting text from PDF (${buffer.length} bytes)`);
    const extractedText = await this.pdfParser.extractText(buffer);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }

    // Generate preview (first 300 characters)
    const preview = extractedText.slice(0, 300).trim();

    // Find the latest crawl history entry for this asset, or create one if missing
    let latestHistory = await this.prisma.policyCrawlHistory.findFirst({
      where: { assetId },
      orderBy: { fetchedAt: 'desc' },
    });

    if (!latestHistory) {
      // Create a new crawl history entry if none exists
      latestHistory = await this.prisma.policyCrawlHistory.create({
        data: {
          assetId,
          sourceId: asset.crawlSourceId,
          contentHash: '', // Empty hash since we're just extracting text
          changeType: 'new',
          contentText: extractedText.slice(0, 50000), // Limit to 50KB for database storage
        },
      });
    } else {
      // Update the latest history entry with extracted text
      await this.prisma.policyCrawlHistory.update({
        where: { id: latestHistory.id },
        data: {
          contentText: extractedText.slice(0, 50000), // Limit to 50KB for database storage
        },
      });
    }

    // Update asset.contentPreview only if it's empty
    const wasPreviewEmpty = !asset.contentPreview || asset.contentPreview.trim().length === 0;
    let previewUpdated = false;
    
    if (wasPreviewEmpty) {
      await this.prisma.asset.update({
        where: { id: assetId },
        data: {
          contentPreview: preview,
        },
      });
      previewUpdated = true;
    }

    this.logger.log(`Text extraction completed: ${extractedText.length} characters extracted, preview updated: ${previewUpdated}`);

    return {
      extractedLength: extractedText.length,
      previewUpdated,
    };
  }
}

