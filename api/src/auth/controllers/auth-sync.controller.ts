import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserSyncService, SyncOptions } from '../services/user-sync.service';
import { ClerkAuthGuard } from '../guards/clerk-auth.guard';

/**
 * Auth Sync Controller
 * 
 * Provides endpoints for ensuring users are synced between Clerk and backend
 */
@Controller('auth')
@UseGuards(ClerkAuthGuard)
export class AuthSyncController {
  constructor(private readonly userSyncService: UserSyncService) {}

  /**
   * POST /auth/ensure-user
   * 
   * Main sync endpoint - ensures user exists in backend
   * This is the new centralized endpoint that replaces scattered sync logic
   * 
   * Options:
   * - waitForWebhook: Wait for webhook before falling back to API (default: true)
   * - webhookTimeout: How long to wait for webhook in ms (default: 5000)
   * - forceSync: Force re-sync even if user exists (default: false)
   */
  @Post('ensure-user')
  @HttpCode(HttpStatus.OK)
  async ensureUser(
    @Request() request,
    @Body() options: SyncOptions = {},
  ) {
    const clerkId = request.user?.clerkId || request.clerk?.userId;
    
    if (!clerkId) {
      return {
        success: false,
        error: 'No Clerk ID found in request',
      };
    }

    try {
      const result = await this.userSyncService.ensureUserExists(clerkId, {
        waitForWebhook: options.waitForWebhook ?? true,
        webhookTimeout: options.webhookTimeout ?? 5000,
        forceSync: options.forceSync ?? false,
      });

      return {
        success: true,
        data: result.user,
        meta: {
          method: result.method,
          synced: result.synced,
          duration: result.duration,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        clerkId,
      };
    }
  }

  /**
   * GET /auth/sync-status
   * 
   * Get current sync queue status (for monitoring)
   */
  @Get('sync-status')
  getSyncStatus() {
    const status = this.userSyncService.getQueueStatus();
    return {
      success: true,
      data: status,
    };
  }
}
