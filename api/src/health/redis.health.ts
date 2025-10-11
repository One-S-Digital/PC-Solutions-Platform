import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Test Redis by setting and getting a test key
      const testKey = 'health:check:test';
      const testValue = Date.now().toString();
      
      await this.cacheManager.set(testKey, testValue, 5000); // 5 second TTL
      const retrieved = await this.cacheManager.get(testKey);
      
      // Clean up test key
      await this.cacheManager.del(testKey);
      
      const latency = Date.now() - startTime;
      const isHealthy = retrieved === testValue;

      if (!isHealthy) {
        throw new Error('Redis read/write test failed');
      }

      const result = this.getStatus(key, isHealthy, {
        latency: `${latency}ms`,
        status: 'connected',
      });

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error.message,
        status: 'disconnected',
      });
      
      throw new HealthCheckError('Redis health check failed', result);
    }
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    return this.isHealthy(key);
  }
}
