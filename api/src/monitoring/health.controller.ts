import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigValidationService } from '../config/config-validation.service';
import { FeaturesService } from '../config/features.service';
import { MetricsService } from './metrics.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

/**
 * Health Check Controller
 * 
 * Provides endpoints for monitoring system health
 * Used by load balancers, monitoring tools, and ops teams
 * 
 * Benefits:
 * - Real-time health status
 * - Early problem detection
 * - Automatic failover support
 * - Operational visibility
 */
@Controller('health')
export class HealthController {
  private clerkClient: any;

  constructor(
    private prisma: PrismaService,
    private configValidation: ConfigValidationService,
    private features: FeaturesService,
    private metrics: MetricsService,
    private config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (secretKey) {
      this.clerkClient = createClerkClient({ secretKey });
    }
  }

  /**
   * Basic health check
   * Returns 200 if service is alive
   */
  @Get()
  @Public()
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Detailed health check with all subsystems
   * Checks database, Clerk API, configuration, etc.
   */
  @Get('detailed')
  @Public()
  async detailedHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkClerkAPI(),
      this.checkConfiguration(),
    ]);

    const [database, clerkApi, configuration] = checks.map(result =>
      result.status === 'fulfilled' ? result.value : { healthy: false, error: result.reason }
    );

    const allHealthy = database.healthy && clerkApi.healthy && configuration.healthy;

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database,
        clerkApi,
        configuration,
      },
      features: this.features.getAllFeatures(),
    };
  }

  /**
   * Auth system health check
   * Specific to authentication subsystem
   */
  @Get('auth')
  @Public()
  async authHealthCheck() {
    const [database, clerkApi] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkClerkAPI(),
    ]);

    const dbResult = database.status === 'fulfilled' ? database.value : { healthy: false };
    const clerkResult = clerkApi.status === 'fulfilled' ? clerkApi.value : { healthy: false };

    // Get metrics for last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const syncMetrics = this.metrics.getUserSyncSummary(oneHourAgo);
    const flowMetrics = this.metrics.getAuthFlowSummary(oneHourAgo);

    return {
      status: dbResult.healthy && clerkResult.healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbResult,
        clerkApi: clerkResult,
        webhookConfigured: this.features.webhookSyncEnabled,
        apiSyncConfigured: this.features.clerkApiSyncEnabled,
        syncStrategy: this.features.syncStrategy,
      },
      metrics: {
        lastHour: {
          userSync: syncMetrics,
          authFlow: flowMetrics,
        },
      },
    };
  }

  /**
   * Readiness check (for Kubernetes/load balancers)
   * Returns 200 only if service is ready to accept traffic
   */
  @Get('ready')
  @Public()
  async readinessCheck() {
    try {
      // Check critical dependencies
      await this.checkDatabase();
      
      const configResult = this.configValidation.getValidationResult();
      if (!configResult || !configResult.valid) {
        throw new Error('Invalid configuration');
      }

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Liveness check (for Kubernetes)
   * Returns 200 if service is alive (even if degraded)
   */
  @Get('live')
  @Public()
  async livenessCheck() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase() {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - startTime;

      return {
        healthy: true,
        responseTime: duration,
        message: 'Database connection OK',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Database connection failed',
      };
    }
  }

  /**
   * Check Clerk API connectivity
   */
  private async checkClerkAPI() {
    if (!this.clerkClient) {
      return {
        healthy: false,
        message: 'Clerk client not configured',
      };
    }

    try {
      const startTime = Date.now();
      // Just ping the API to check connectivity
      // Don't actually fetch a user (might not exist)
      await this.clerkClient.users.getUserList({ limit: 1 });
      const duration = Date.now() - startTime;

      return {
        healthy: true,
        responseTime: duration,
        message: 'Clerk API connection OK',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Clerk API connection failed',
      };
    }
  }

  /**
   * Check configuration status
   */
  private async checkConfiguration() {
    const validationResult = this.configValidation.getValidationResult();
    
    if (!validationResult) {
      return {
        healthy: false,
        message: 'Configuration not validated',
      };
    }

    return {
      healthy: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      message: validationResult.valid ? 'Configuration OK' : 'Configuration has errors',
    };
  }
}
