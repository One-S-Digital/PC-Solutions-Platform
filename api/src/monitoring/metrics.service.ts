import { Injectable, Logger } from '@nestjs/common';

export interface AuthMetric {
  timestamp: number;
  clerkId: string;
  method: 'webhook' | 'api' | 'database';
  duration: number;
  success: boolean;
  error?: string;
}

export interface AuthFlowMetric {
  timestamp: number;
  flow: 'signup' | 'login';
  duration: number;
  steps: string[];
  success: boolean;
  error?: string;
}

export interface MetricsSummary {
  total: number;
  successful: number;
  failed: number;
  averageDuration: number;
  byMethod: {
    [key: string]: number;
  };
}

/**
 * Metrics Collection Service
 * 
 * Collects and aggregates metrics for monitoring auth performance
 * In production, would send to DataDog, NewRelic, CloudWatch, etc.
 * 
 * Benefits:
 * - Performance tracking
 * - Issue detection
 * - Capacity planning
 * - SLA monitoring
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics: {
    userSync: AuthMetric[];
    authFlow: AuthFlowMetric[];
  } = {
    userSync: [],
    authFlow: [],
  };

  private readonly maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Record user sync metric
   */
  recordUserSync(data: {
    clerkId: string;
    method: 'webhook' | 'api' | 'database';
    duration: number;
    success: boolean;
    error?: string;
  }) {
    const metric: AuthMetric = {
      timestamp: Date.now(),
      ...data,
    };

    this.metrics.userSync.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.userSync.length > this.maxMetrics) {
      this.metrics.userSync.shift();
    }

    // Log significant events
    if (!data.success) {
      this.logger.warn(`User sync failed: ${data.clerkId} via ${data.method}`, {
        error: data.error,
        duration: data.duration,
      });
    } else if (data.duration > 5000) {
      this.logger.warn(`Slow user sync: ${data.clerkId} via ${data.method}`, {
        duration: data.duration,
      });
    }

    // In production, send to monitoring service
    this.sendToMonitoringService('user_sync', metric);
  }

  /**
   * Record auth flow metric
   */
  recordAuthFlow(data: {
    flow: 'signup' | 'login';
    duration: number;
    steps: string[];
    success: boolean;
    error?: string;
  }) {
    const metric: AuthFlowMetric = {
      timestamp: Date.now(),
      ...data,
    };

    this.metrics.authFlow.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.authFlow.length > this.maxMetrics) {
      this.metrics.authFlow.shift();
    }

    // Log significant events
    if (!data.success) {
      this.logger.error(`Auth flow failed: ${data.flow}`, {
        error: data.error,
        duration: data.duration,
        steps: data.steps,
      });
    } else if (data.duration > 10000) {
      this.logger.warn(`Slow auth flow: ${data.flow}`, {
        duration: data.duration,
        steps: data.steps,
      });
    }

    // In production, send to monitoring service
    this.sendToMonitoringService('auth_flow', metric);
  }

  /**
   * Get user sync metrics summary
   */
  getUserSyncSummary(since?: number): MetricsSummary {
    const metrics = since
      ? this.metrics.userSync.filter(m => m.timestamp >= since)
      : this.metrics.userSync;

    return this.calculateSummary(metrics);
  }

  /**
   * Get auth flow metrics summary
   */
  getAuthFlowSummary(since?: number): MetricsSummary {
    const metrics = since
      ? this.metrics.authFlow.filter(m => m.timestamp >= since)
      : this.metrics.authFlow;

    return this.calculateSummary(metrics);
  }

  /**
   * Calculate metrics summary
   */
  private calculateSummary(metrics: (AuthMetric | AuthFlowMetric)[]): MetricsSummary {
    if (metrics.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        byMethod: {},
      };
    }

    const successful = metrics.filter(m => m.success).length;
    const failed = metrics.length - successful;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / metrics.length;

    const byMethod: { [key: string]: number } = {};
    metrics.forEach(m => {
      const method = 'method' in m ? m.method : 'flow';
      byMethod[method] = (byMethod[method] || 0) + 1;
    });

    return {
      total: metrics.length,
      successful,
      failed,
      averageDuration: Math.round(averageDuration),
      byMethod,
    };
  }

  /**
   * Get all metrics (for debugging/admin)
   */
  getAllMetrics() {
    return {
      userSync: this.metrics.userSync,
      authFlow: this.metrics.authFlow,
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics() {
    this.metrics.userSync = [];
    this.metrics.authFlow = [];
  }

  /**
   * Send to external monitoring service
   * In production, implement integration with DataDog, NewRelic, etc.
   */
  private sendToMonitoringService(type: string, metric: any) {
    // TODO: Implement actual monitoring service integration
    // Examples:
    // - DataDog: dogstatsd.increment('auth.user_sync', 1, [`method:${metric.method}`])
    // - NewRelic: newrelic.recordMetric('Custom/Auth/UserSync', metric.duration)
    // - CloudWatch: cloudwatch.putMetricData({ ... })
    
    // For now, just log in development
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[METRICS] ${type}:`, metric);
    }
  }
}
