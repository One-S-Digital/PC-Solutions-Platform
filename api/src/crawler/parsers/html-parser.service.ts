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

          // Skip URLs with navigation hash fragments (e.g., #nav-primary, #menu, #top)
          const urlHash = new URL(absoluteUrl).hash.toLowerCase();
          if (urlHash && (urlHash.includes('#nav') || urlHash.includes('#menu') || urlHash.includes('#top') || 
              urlHash.includes('#header') || urlHash.includes('#footer') || urlHash.includes('#skip'))) {
            return; // Skip navigation anchor links
          }

          // Filter out common navigation/footer links (not policy content)
          const anchorText = $link.text().trim() || $link.attr('title') || '';
          const anchorLower = anchorText.toLowerCase();
          const normalizedAnchor = anchorLower.replace(/\s+/g, ' ').trim();

          // If link is inside nav/header/footer chrome, treat it as navigation unless it is a PDF.
          // This prevents overly broad keyword-based filters from dropping real policy PDFs
          // that happen to contain common words (e.g. "accueil") in their titles.
          const inNavChrome =
            $link.parents('nav, header, footer').length > 0 ||
            $link.parents('[class*="nav"], [class*="menu"], [id*="nav"], [id*="menu"]').length > 0;
          if (inNavChrome && !isPdf) {
            return;
          }
          
          // Common navigation/footer link patterns to skip (multi-language: FR, DE, EN)
          // IMPORTANT: avoid single generic words like "accueil" or "structure" which are common in childcare policy titles.
          const navigationContainsPatterns = [
            // Legal/Privacy pages
            'mentions légales', 'legal notice', 'legal notices', 'impressum', 'datenschutz', 'privacy', 'privacy policy',
            'disclaimer', 'terms of service', 'terms and conditions',
            // Sitemap
            'plan du site', 'sitemap', 'site map', 'seitenverzeichnis',
            // Contact
            'contact', 'kontakt', 'contact us', 'get in touch',
            // Navigation
            'retour', 'back', 'zurück', 'back to', 'return to',
            // Organizational charts (not policies)
            'organigramme', 'organigram', 'organigramm', 'organizational chart', 'org chart',
            'organizational structure', 'organigramme détaillé', 'organigramme simplifié',
            // Job listings
            'offres d\'emploi', 'offres emploi', 'job offers', 'job offer', 'stellenangebote', 'stellenangebot',
            'careers', 'recruitment', 'recrutement', 'rekrutierung',
            'jobs', 'poste', 'stelle', 'position', 'vacancy', 'vacancies',
            // Login/Search
            'se connecter', 'connecter', 'login', 'anmelden', 'sign in', 'sign up', 'register',
            'recherche', 'search', 'suche', 'find', 'suche nach',
            // Other common navigation
            'about', 'about us', 'über uns', 'à propos', 'propos',
            'news', 'newsletter', 'actualités', 'aktuelles',
            'help', 'aide', 'hilfe', 'support',
          ];

          // Short/ambiguous navigation labels must match exactly.
          // This avoids filtering titles like "accueil de jour" or "structures d'accueil".
          const navigationExactLabels = new Set([
            // Navigation
            'accueil', 'home', 'startseite', 'homepage', 'home page',
            'menu', 'navigation', 'nav', 'menü',
            'haut', 'top', 'nach oben', 'go to top', 'scroll to top',
            'retour', 'back', 'zurück',
          ]);
          
          if (!isPdf && (navigationExactLabels.has(normalizedAnchor) || navigationContainsPatterns.some(pattern => anchorLower.includes(pattern)))) {
            return; // Skip navigation/footer links
          }

          // Filter out common administrative URL paths (multi-language: FR, DE, EN)
          const urlPath = new URL(absoluteUrl).pathname.toLowerCase();
          const excludedPaths = [
            // Contact pages
            '/contact', '/kontakt', '/contact-us', '/get-in-touch',
            // Legal/Privacy
            '/mentions-legales', '/legal', '/impressum', '/privacy', '/privacy-policy',
            '/disclaimer', '/terms', '/terms-of-service',
            // Sitemap
            '/plan-du-site', '/sitemap', '/site-map', '/seitenverzeichnis',
            // Organizational pages (not policies)
            '/organigramme', '/organigram', '/organigramm', '/org-chart',
            '/organizational-chart', '/organizational-structure',
            // Job listings
            '/offres-emploi', '/offres-d-emploi', '/jobs', '/stellenangebote', '/careers',
            '/recruitment', '/recrutement', '/rekrutierung',
            // Login/Search
            '/login', '/anmelden', '/se-connecter', '/sign-in', '/sign-up',
            '/recherche', '/search', '/suche',
            // Other navigation
            '/about', '/about-us', '/uber-uns', '/a-propos',
            '/news', '/newsletter', '/actualites', '/aktuelles',
            '/help', '/aide', '/hilfe', '/support',
            '/themes', '/themes/', '/topics', '/topics/', // Theme navigation
          ];
          
          if (excludedPaths.some(path => urlPath === path || urlPath.startsWith(path + '/'))) {
            return; // Skip administrative/navigation pages
          }
          
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

