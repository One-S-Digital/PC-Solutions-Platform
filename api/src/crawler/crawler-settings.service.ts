import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CrawlerSchedulerMode = 'manual' | 'automatic';

@Injectable()
export class CrawlerSettingsService {
  private readonly logger = new Logger(CrawlerSettingsService.name);

  private static readonly SCHEDULER_MODE_KEY = 'crawler.scheduler.mode';

  constructor(private readonly prisma: PrismaService) {}

  private normalizeMode(value: unknown): CrawlerSchedulerMode {
    if (value === 'manual' || value === 'automatic') return value;
    // Back-compat: allow { mode: "manual" }
    if (value && typeof value === 'object' && (value as any).mode) {
      const m = (value as any).mode;
      if (m === 'manual' || m === 'automatic') return m;
    }
    return 'manual';
  }

  async getSchedulerMode(): Promise<CrawlerSchedulerMode> {
    try {
      // Use upsert to avoid races on first read.
      const row = await this.prisma.systemSettings.upsert({
        where: { key: CrawlerSettingsService.SCHEDULER_MODE_KEY },
        update: {},
        create: {
          key: CrawlerSettingsService.SCHEDULER_MODE_KEY,
          value: 'manual',
          description: 'Policy crawler scheduler mode (manual disables cron; automatic enables cron)',
          category: 'crawler',
          isEncrypted: false,
          isPublic: false,
        },
      });

      return this.normalizeMode(row.value);
    } catch (e: any) {
      // If DB is unavailable, be safe and default to manual.
      this.logger.warn(`Failed to read scheduler mode from DB; defaulting to manual (${e?.message || e})`);
      return 'manual';
    }
  }

  async setSchedulerMode(mode: unknown): Promise<CrawlerSchedulerMode> {
    const normalized = this.normalizeMode(mode);
    try {
      await this.prisma.systemSettings.upsert({
        where: { key: CrawlerSettingsService.SCHEDULER_MODE_KEY },
        update: {
          value: normalized,
          category: 'crawler',
          description: 'Policy crawler scheduler mode (manual disables cron; automatic enables cron)',
          isEncrypted: false,
          isPublic: false,
          updatedAt: new Date(),
        },
        create: {
          key: CrawlerSettingsService.SCHEDULER_MODE_KEY,
          value: normalized,
          description: 'Policy crawler scheduler mode (manual disables cron; automatic enables cron)',
          category: 'crawler',
          isEncrypted: false,
          isPublic: false,
        },
      });
      return normalized;
    } catch (e: any) {
      this.logger.error(`Failed to update scheduler mode (${normalized}): ${e?.message || e}`);
      throw e;
    }
  }
}

