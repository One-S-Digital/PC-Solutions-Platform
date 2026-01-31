import { Injectable, Logger } from '@nestjs/common';

/**
 * Playwright renderer for JS-heavy sites
 * This is optional - only needed for cantons that use heavy JavaScript
 * 
 * Implementation note:
 * - If `playwright` is installed, we will use Chromium to render the page.
 * - If not installed (default), we fall back to a normal HTTP fetch (best-effort).
 */
@Injectable()
export class PlaywrightRendererService {
  private readonly logger = new Logger(PlaywrightRendererService.name);

  /**
   * Fetch and render a page using Playwright
   * @param url The URL to fetch
   * @returns The rendered HTML content
   */
  async fetchWithPlaywright(url: string): Promise<string> {
    try {
      // Keep this dependency optional. If it isn't installed, the import will throw.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const playwright: any = await import('playwright');
      const chromium = playwright?.chromium;

      if (!chromium) {
        throw new Error('Playwright import succeeded but chromium is missing');
      }

      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
          'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
        });

        // Wait for network idle to catch most JS-driven content.
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        return await page.content();
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      // Fallback: best-effort static fetch so "dynamic" sources don't hard-fail.
      this.logger.warn(
        `Playwright not available for ${url} (${error?.message || 'unknown error'}). Falling back to static fetch.`
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
      } finally {
        clearTimeout(timeout);
      }
    }
  }
}

