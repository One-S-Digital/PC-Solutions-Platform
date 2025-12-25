import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CrawlerScheduler } from './crawler.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateSourceDto, UpdateSourceDto, ReviewQueueQueryDto } from './dto/crawler.dto';

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

    try {
      const results = await this.crawlerScheduler.triggerCrawl(id);
      return { success: true, data: results };
    } catch (error: any) {
      // Provide user-friendly error messages
      if (error.message?.includes('Network error') || error.message?.includes('ETIMEDOUT')) {
        throw new BadRequestException(
          `Failed to crawl source: ${error.message}. This may be due to network connectivity issues or the target URL being unreachable.`
        );
      }
      throw error;
    }
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

    const [policies, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { lastCrawledAt: 'desc' },
        take: query.limit || 100, // Increased default limit to show more documents
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: policies,
      total,
      limit: query.limit || 100,
    };
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

  // Test URL connectivity (for debugging)
  @Get('test-url')
  async testUrl(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout for test

      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProCreche-PolicyCrawler/1.0 (policy-updates@procreche.ch)',
        },
      });
      const duration = Date.now() - startTime;

      clearTimeout(timeout);

      return {
        success: true,
        url,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          lastModified: response.headers.get('last-modified'),
          etag: response.headers.get('etag'),
        },
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          url,
          error: 'Request timeout after 10 seconds',
          errorCode: 'TIMEOUT',
        };
      }
      return {
        success: false,
        url,
        error: error.message || 'Unknown error',
        errorCode: error.cause?.code || 'UNKNOWN',
        errorDetails: error.cause?.message || error.stack,
      };
    }
  }
}

