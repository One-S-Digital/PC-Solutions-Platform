import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';

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
      // Keep this dependency optional.
      // IMPORTANT: do not use `import('playwright')` here because TypeScript will fail the build
      // when `playwright` is not installed (which is the default on Render).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const require: any = createRequire(__filename);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const playwright: any = require('playwright');
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
          '--disable-gpu',
        ],
      });

      try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Reduce memory/network usage: block non-essential resources.
        // Keep scripts enabled so JS-heavy pages can still render.
        await page.route('**/*', async (route) => {
          try {
            const type = route.request().resourceType();
            if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
              return await route.abort();
            }
          } catch {
            // ignore
          }
          return await route.continue();
        });

        await page.setExtraHTTPHeaders({
          'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
        });

        // Use DOMContentLoaded first to avoid waiting forever on analytics/long-polling.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Best-effort: give the page a short window to settle.
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

        const html = await page.content();
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
        return html;
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

