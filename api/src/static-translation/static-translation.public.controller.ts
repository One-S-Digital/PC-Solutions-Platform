import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { StaticTranslationService } from './static-translation.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Static Translations Public')
@Controller('static-translations/public')
export class StaticTranslationPublicController {
  constructor(private readonly service: StaticTranslationService) {}

  /**
   * Public status endpoint for full sync jobs.
   *
   * HARD REQUIREMENTS:
   * - No auth (public)
   * - No guards / roles / bearer auth
   * - In‑memory read only (getFullSyncJob)
   * - No DB, no filesystem, no translation logic
   * - No async work
   * - Always returns HTTP 200 with JSON
   */
  @Get('full-sync/:jobId/status')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get full sync job status (public, non-blocking)' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  async getFullSyncStatus(
    @Param('jobId') jobId: string,
  ): Promise<{
    success: boolean;
    job?: any;
    message?: string;
    error?: string;
  }> {
    try {
      // In-memory read only - no DB/fs/translation logic
      const job = this.service.getFullSyncJob(jobId);

      if (!job) {
        return {
          success: true,
          job: null,
          message: 'Job not found or expired',
        };
      }

      const duration =
        job.completedAt && job.startedAt
          ? job.completedAt - job.startedAt
          : job.startedAt
          ? Date.now() - job.startedAt
          : undefined;

      return {
        success: true,
        job: {
          ...job,
          duration,
        },
      };
    } catch (e: any) {
      // Always return JSON, never throw
      return {
        success: false,
        error: e?.message || 'Failed to retrieve job status',
      };
    }
  }
}


