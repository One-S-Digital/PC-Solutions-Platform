/**
 * Performance Optimization Utilities
 * 
 * This module provides performance optimizations for the translation system
 * including lazy loading, caching, and memory management.
 */

import { SupportedLanguage, TranslationNamespace } from './types';

/**
 * Translation cache
 */
class TranslationCache {
  private cache = new Map<string, any>();
  private maxSize = 1000;
  private ttl = 5 * 60 * 1000; // 5 minutes
  private timestamps = new Map<string, number>();

  set(key: string, value: any): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  get(key: string): any | null {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Lazy loading manager
 */
class LazyLoadingManager {
  private loadingPromises = new Map<string, Promise<any>>();
  private loadedNamespaces = new Set<string>();

  async loadNamespace(
    language: SupportedLanguage,
    namespace: TranslationNamespace
  ): Promise<any> {
    const key = `${language}:${namespace}`;
    
    if (this.loadedNamespaces.has(key)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const promise = this.loadNamespaceFromFile(language, namespace);
    this.loadingPromises.set(key, promise);
    
    try {
      await promise;
      this.loadedNamespaces.add(key);
    } finally {
      this.loadingPromises.delete(key);
    }

    return promise;
  }

  private async loadNamespaceFromFile(
    language: SupportedLanguage,
    namespace: TranslationNamespace
  ): Promise<any> {
    // This would be implemented based on your specific loading mechanism
    // For now, we'll simulate the loading
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ loaded: true, language, namespace });
      }, 100);
    });
  }

  isLoaded(language: SupportedLanguage, namespace: TranslationNamespace): boolean {
    const key = `${language}:${namespace}`;
    return this.loadedNamespaces.has(key);
  }

  preloadNamespaces(
    language: SupportedLanguage,
    namespaces: TranslationNamespace[]
  ): Promise<void[]> {
    return Promise.all(
      namespaces.map(namespace => this.loadNamespace(language, namespace))
    );
  }
}

/**
 * Memory management utilities
 */
class MemoryManager {
  private static instance: MemoryManager;
  private cache = new TranslationCache();
  private lazyLoader = new LazyLoadingManager();

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  getCache(): TranslationCache {
    return this.cache;
  }

  getLazyLoader(): LazyLoadingManager {
    return this.lazyLoader;
  }

  /**
   * Clean up unused translations
   */
  cleanup(): void {
    this.cache.clear();
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    cacheSize: number;
    loadedNamespaces: number;
    memoryUsage: number;
  } {
    return {
      cacheSize: this.cache.size(),
      loadedNamespaces: this.lazyLoader['loadedNamespaces'].size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    return this.cache.size() * 1024; // 1KB per cached item
  }
}

/**
 * Performance monitoring
 */
class PerformanceMonitor {
  private metrics = {
    translationCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    loadTimes: [] as number[],
    errors: 0
  };

  recordTranslationCall(): void {
    this.metrics.translationCalls++;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordLoadTime(time: number): void {
    this.metrics.loadTimes.push(time);
    // Keep only last 100 load times
    if (this.metrics.loadTimes.length > 100) {
      this.metrics.loadTimes.shift();
    }
  }

  recordError(): void {
    this.metrics.errors++;
  }

  getMetrics(): {
    translationCalls: number;
    cacheHitRate: number;
    averageLoadTime: number;
    errors: number;
  } {
    const cacheHitRate = this.metrics.translationCalls > 0 
      ? this.metrics.cacheHits / this.metrics.translationCalls 
      : 0;

    const averageLoadTime = this.metrics.loadTimes.length > 0
      ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length
      : 0;

    return {
      translationCalls: this.metrics.translationCalls,
      cacheHitRate,
      averageLoadTime,
      errors: this.metrics.errors
    };
  }

  reset(): void {
    this.metrics = {
      translationCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      loadTimes: [],
      errors: 0
    };
  }
}

/**
 * Optimized translation hook with caching
 */
export function useOptimizedTranslation(namespace?: TranslationNamespace) {
  const memoryManager = MemoryManager.getInstance();
  const monitor = new PerformanceMonitor();
  const cache = memoryManager.getCache();

  const translate = (key: string, options?: any): string => {
    monitor.recordTranslationCall();
    
    const cacheKey = `${namespace || 'common'}:${key}:${JSON.stringify(options || {})}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      monitor.recordCacheHit();
      return cached;
    }

    monitor.recordCacheMiss();
    
    // Simulate translation lookup
    const translation = `translated_${key}`;
    cache.set(cacheKey, translation);
    
    return translation;
  };

  return {
    t: translate,
    getMetrics: () => monitor.getMetrics(),
    clearCache: () => cache.clear()
  };
}

/**
 * Preload translations for better performance
 */
export async function preloadTranslations(
  language: SupportedLanguage,
  namespaces: TranslationNamespace[]
): Promise<void> {
  const memoryManager = MemoryManager.getInstance();
  const lazyLoader = memoryManager.getLazyLoader();
  
  const startTime = performance.now();
  
  try {
    await lazyLoader.preloadNamespaces(language, namespaces);
    const loadTime = performance.now() - startTime;
    
    const monitor = new PerformanceMonitor();
    monitor.recordLoadTime(loadTime);
  } catch (error) {
    console.error('Failed to preload translations:', error);
  }
}

/**
 * Export performance utilities
 */
export const PerformanceUtils = {
  MemoryManager,
  LazyLoadingManager,
  PerformanceMonitor,
  useOptimizedTranslation,
  preloadTranslations
};

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  cacheSize: number;
  ttl: number;
  preloadNamespaces: TranslationNamespace[];
  enableMonitoring: boolean;
}

/**
 * Configure performance settings
 */
export function configurePerformance(config: Partial<PerformanceConfig>): void {
  const memoryManager = MemoryManager.getInstance();
  const cache = memoryManager.getCache();
  
  if (config.cacheSize) {
    cache['maxSize'] = config.cacheSize;
  }
  
  if (config.ttl) {
    cache['ttl'] = config.ttl;
  }
  
  if (config.preloadNamespaces) {
    // Preload namespaces for current language
    const currentLanguage = 'en' as SupportedLanguage; // This would be dynamic
    preloadTranslations(currentLanguage, config.preloadNamespaces);
  }
}