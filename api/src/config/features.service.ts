import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SyncStrategy = 'webhook-only' | 'api-only' | 'hybrid' | 'unavailable';

/**
 * Feature Flags Service
 * 
 * Runtime feature detection based on configuration
 * Enables graceful degradation when features are unavailable
 * 
 * Benefits:
 * - Runtime feature detection
 * - Graceful degradation
 * - Clear feature availability
 * - Easy to extend
 */
@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(private configService: ConfigService) {
    this.logFeatureStatus();
  }

  /**
   * Check if webhook sync is enabled
   */
  get webhookSyncEnabled(): boolean {
    const secret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
    return !!secret && secret.startsWith('whsec_');
  }

  /**
   * Check if Clerk API sync is enabled
   */
  get clerkApiSyncEnabled(): boolean {
    const secret = this.configService.get<string>('CLERK_SECRET_KEY');
    return !!secret && (secret.startsWith('sk_test_') || secret.startsWith('sk_live_'));
  }

  /**
   * Get current sync strategy
   */
  get syncStrategy(): SyncStrategy {
    const hasWebhook = this.webhookSyncEnabled;
    const hasApi = this.clerkApiSyncEnabled;

    if (hasWebhook && hasApi) return 'hybrid';
    if (hasApi) return 'api-only';
    if (hasWebhook) return 'webhook-only';
    return 'unavailable';
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature: string): boolean {
    switch (feature) {
      case 'webhook-sync':
        return this.webhookSyncEnabled;
      
      case 'api-sync':
        return this.clerkApiSyncEnabled;
      
      case 'hybrid-sync':
        return this.webhookSyncEnabled && this.clerkApiSyncEnabled;
      
      case 'redis-queue':
        const redisHost = this.configService.get<string>('REDIS_HOST');
        return !!redisHost;
      
      case 'metrics':
        const metricsEnabled = this.configService.get<string>('ENABLE_METRICS');
        return metricsEnabled === 'true';
      
      default:
        return false;
    }
  }

  /**
   * Get all feature flags
   */
  getAllFeatures() {
    return {
      webhookSync: this.webhookSyncEnabled,
      apiSync: this.clerkApiSyncEnabled,
      syncStrategy: this.syncStrategy,
      redisQueue: this.isEnabled('redis-queue'),
      metrics: this.isEnabled('metrics'),
    };
  }

  /**
   * Log feature status on startup
   */
  private logFeatureStatus() {
    this.logger.log('🎛️  Feature Status:');
    this.logger.log(`   - Webhook Sync: ${this.webhookSyncEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    this.logger.log(`   - API Sync: ${this.clerkApiSyncEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    this.logger.log(`   - Sync Strategy: ${this.syncStrategy}`);
    this.logger.log(`   - Redis Queue: ${this.isEnabled('redis-queue') ? '✅ Enabled' : '❌ Disabled'}`);
    this.logger.log(`   - Metrics: ${this.isEnabled('metrics') ? '✅ Enabled' : '❌ Disabled'}`);

    if (this.syncStrategy === 'unavailable') {
      this.logger.error('❌ CRITICAL: No sync strategy available!');
      this.logger.error('   Set either CLERK_SECRET_KEY or CLERK_WEBHOOK_SECRET');
    } else if (this.syncStrategy === 'webhook-only') {
      this.logger.warn('⚠️  WARNING: Using webhook-only strategy');
      this.logger.warn('   Consider setting CLERK_SECRET_KEY for fallback sync');
    }
  }
}
