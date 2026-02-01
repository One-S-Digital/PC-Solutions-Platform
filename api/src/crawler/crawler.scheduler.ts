import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlerService } from './crawler.service';

@Injectable()
export class CrawlerScheduler implements OnModuleInit {
  private readonly logger = new Logger(CrawlerScheduler.name);
  private isRunning = false;

  private isSchedulerEnabled(): boolean {
    return process.env.CRAWLER_SCHEDULER_ENABLED === 'true';
  }

  private isCrawlerEnabled(): boolean {
    return process.env.CRAWLER_ENABLED === 'true';
  }

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
    if (!this.isCrawlerEnabled() || !this.isSchedulerEnabled()) {
      // Keep this fast/no-op by default to avoid surprising work on Render.
      return;
    }

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
  async triggerCrawl(
    sourceId: number,
    options?: { debug?: boolean; debugLimit?: number },
  ): Promise<any> {
    if (!this.isCrawlerEnabled()) {
      throw new Error('Crawler is disabled (set CRAWLER_ENABLED=true to enable).');
    }
    return this.crawler.crawlSource(sourceId, options);
  }

  // Check for stale sources daily
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkStaleSources() {
    if (!this.isCrawlerEnabled() || !this.isSchedulerEnabled()) {
      return;
    }

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
}

