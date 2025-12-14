import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
// Note: cheerio 1.x uses default export, but * as cheerio also works

export interface CandidateDocument {
  url: string;
  title: string;
  isPdf: boolean;
  sectionHeading?: string;
  anchorText: string;
}

@Injectable()
export class HtmlParserService {
  private readonly logger = new Logger(HtmlParserService.name);

  /**
   * Extract candidate document links from HTML page
   * @param html The HTML content
   * @param baseUrl The base URL for resolving relative links
   * @param cssSelector Optional CSS selector to limit search to specific container
   * @returns Array of candidate documents
   */
  extractLinks(html: string, baseUrl: string, cssSelector?: string | null): CandidateDocument[] {
    try {
      // cheerio 1.x API - load() returns a CheerioAPI
      const $ = cheerio.load(html);
      const candidates: CandidateDocument[] = [];
      const baseUrlObj = new URL(baseUrl);
      
      // Determine search scope
      const searchRoot = cssSelector ? $(cssSelector) : $('body');
      
      if (searchRoot.length === 0 && cssSelector) {
        this.logger.warn(`CSS selector "${cssSelector}" not found on page ${baseUrl}`);
        // Fall back to body if selector not found
        return this.extractLinks(html, baseUrl, null);
      }

      // Find all links
      searchRoot.find('a[href]').each((_, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        if (!href) return;

        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, baseUrl).toString();
          
          // Only process PDFs and HTML pages (skip mailto:, tel:, etc.)
          const urlLower = absoluteUrl.toLowerCase();
          if (urlLower.startsWith('mailto:') || urlLower.startsWith('tel:') || urlLower.startsWith('javascript:')) {
            return;
          }

          const isPdf = urlLower.endsWith('.pdf') || urlLower.includes('.pdf?');
          
          // Get anchor text (prefer text content, fall back to title attribute)
          const anchorText = $link.text().trim() || $link.attr('title') || '';
          if (!anchorText && !isPdf) {
            // Skip links without text unless they're PDFs (PDFs might not have descriptive text)
            return;
          }

          // Try to find section heading (parent heading or nearby heading)
          let sectionHeading: string | undefined;
          const $parent = $link.parents('section, article, div[class*="section"], div[class*="content"]').first();
          if ($parent.length > 0) {
            // Look for heading in parent or siblings
            const $heading = $parent.find('h1, h2, h3, h4, h5, h6').first();
            if ($heading.length > 0) {
              sectionHeading = $heading.text().trim();
            } else {
              // Check previous siblings
              const $prevHeading = $link.parentsUntil($parent).prevAll('h1, h2, h3, h4, h5, h6').first();
              if ($prevHeading.length > 0) {
                sectionHeading = $prevHeading.text().trim();
              }
            }
          }

          // Use filename as title if no anchor text for PDFs
          const title = anchorText || (isPdf ? this.extractFilenameFromUrl(absoluteUrl) : absoluteUrl);

          candidates.push({
            url: absoluteUrl,
            title,
            isPdf,
            sectionHeading,
            anchorText: anchorText || title,
          });
        } catch (urlError) {
          this.logger.warn(`Failed to parse URL ${href}: ${urlError.message}`);
        }
      });

      // Remove duplicates based on URL
      const uniqueCandidates = Array.from(
        new Map(candidates.map(c => [c.url, c])).values()
      );

      this.logger.log(`Extracted ${uniqueCandidates.length} unique candidate links from ${baseUrl}`);
      return uniqueCandidates;
    } catch (error) {
      this.logger.error(`Failed to parse HTML from ${baseUrl}: ${error.message}`);
      return [];
    }
  }

  private extractFilenameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').pop() || 'document';
      // Remove extension for cleaner title
      return filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    } catch {
      return 'document';
    }
  }
}

