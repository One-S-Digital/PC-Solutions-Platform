import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

/**
 * Service for tracking application metrics
 * Exposes Prometheus-compatible metrics via /metrics endpoint
 */
@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  // HTTP metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;

  // Upload metrics
  public readonly uploadTotal: Counter<string>;
  public readonly uploadSize: Histogram<string>;
  public readonly uploadErrors: Counter<string>;

  // Database metrics
  public readonly dbQueryDuration: Histogram<string>;
  public readonly dbConnectionPool: Gauge<string>;

  // Business metrics
  public readonly activeUsers: Gauge<string>;
  public readonly contentItems: Gauge<string>;
  public readonly policyAlerts: Gauge<string>;

  // Cache metrics
  public readonly cacheHits: Counter<string>;
  public readonly cacheMisses: Counter<string>;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Upload Metrics
    this.uploadTotal = new Counter({
      name: 'content_uploads_total',
      help: 'Total number of content uploads',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.uploadSize = new Histogram({
      name: 'content_upload_size_bytes',
      help: 'Size of uploaded content in bytes',
      labelNames: ['type'],
      buckets: [1000, 10000, 100000, 1000000, 10000000, 100000000],
      registers: [this.registry],
    });

    this.uploadErrors = new Counter({
      name: 'content_upload_errors_total',
      help: 'Total number of upload errors',
      labelNames: ['type', 'error'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbConnectionPool = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Current database connection pool size',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // Business Metrics
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.contentItems = new Gauge({
      name: 'content_items_total',
      help: 'Total number of content items',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.policyAlerts = new Gauge({
      name: 'policy_alerts_total',
      help: 'Total number of policy alerts',
      labelNames: ['type', 'active'],
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['key'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['key'],
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, path: string, status: number, duration: number) {
    this.httpRequestsTotal.inc({ method, path, status });
    this.httpRequestDuration.observe({ method, path, status }, duration / 1000);
  }

  /**
   * Track upload
   */
  trackUpload(type: string, size: number, success: boolean) {
    this.uploadTotal.inc({ type, status: success ? 'success' : 'failure' });
    if (success) {
      this.uploadSize.observe({ type }, size);
    }
  }

  /**
   * Track upload error
   */
  trackUploadError(type: string, error: string) {
    this.uploadErrors.inc({ type, error });
  }

  /**
   * Track database query
   */
  trackDbQuery(operation: string, model: string, duration: number) {
    this.dbQueryDuration.observe({ operation, model }, duration / 1000);
  }

  /**
   * Update cache metrics
   */
  trackCacheHit(key: string) {
    this.cacheHits.inc({ key });
  }

  trackCacheMiss(key: string) {
    this.cacheMisses.inc({ key });
  }

  /**
   * Update business metrics (called periodically)
   */
  async updateBusinessMetrics(prisma: any) {
    // Active users (placeholder - would need session tracking)
    // this.activeUsers.set(count);

    // Content items by status
    const [published, draft, archived] = await Promise.all([
      prisma.contentItem.count({ where: { status: 'PUBLISHED' } }),
      prisma.contentItem.count({ where: { status: 'DRAFT' } }),
      prisma.contentItem.count({ where: { status: 'ARCHIVED' } }),
    ]);

    this.contentItems.set({ status: 'published' }, published);
    this.contentItems.set({ status: 'draft' }, draft);
    this.contentItems.set({ status: 'archived' }, archived);

    // Policy alerts
    const [activeAlerts, inactiveAlerts] = await Promise.all([
      prisma.policyAlert.count({ where: { isActive: true } }),
      prisma.policyAlert.count({ where: { isActive: false } }),
    ]);

    this.policyAlerts.set({ active: 'true' }, activeAlerts);
    this.policyAlerts.set({ active: 'false' }, inactiveAlerts);
  }
}
