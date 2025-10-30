/**
 * Frontend UI Debugger - Comprehensive frontend debugging tool
 * 
 * Logs everything: Network, State, Components, Events, Errors, Performance
 * Simple localStorage-based logger that survives reloads/redirects.
 * No IndexedDB, no beacons, no Service Workers.
 */

const STORAGE_KEYS = {
  LOG: 'FRONTEND_DEBUG_LOG',
  ENABLED: 'FRONTEND_DEBUG_ENABLED',
  FLOW: 'FRONTEND_DEBUG_FLOW',
  LAST_URL: 'FRONTEND_DEBUG_LAST_URL',
  PAUSED: 'FRONTEND_DEBUG_PAUSED',
  FILTERS: 'FRONTEND_DEBUG_FILTERS',
} as const;

const MAX_LOG_LINES = 5000;

export type LogCategory = 
  | 'APP'       // App lifecycle (boot, ready, hydration)
  | 'ROUTER'    // Route changes, navigation
  | 'NETWORK'   // HTTP requests/responses
  | 'STATE'     // State changes (Context, Redux, etc.)
  | 'COMPONENT' // Component lifecycle (mount, unmount, render)
  | 'EVENT'     // User events (click, submit, etc.)
  | 'AUTH'      // Authentication events
  | 'GUARD'     // Route guards
  | 'FORM'      // Form submissions, validation
  | 'STORAGE'   // localStorage/sessionStorage changes
  | 'CONSOLE'   // Console logs captured
  | 'ERROR'     // Errors and warnings
  | 'PERF'      // Performance measurements
  | 'WS'        // WebSocket events
  | 'CUSTOM';   // Custom developer logs

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

interface LogEntry {
  timestamp: string;
  flow: string;
  page: string;
  category: LogCategory;
  action: string;
  level: LogLevel;
  details: string;
  stack?: string;
}

interface DebugFilters {
  categories: Set<LogCategory>;
  levels: Set<LogLevel>;
  searchText: string;
}

class FrontendDebugger {
  private flowId: string;
  private paused: boolean = false;
  private filters: DebugFilters;
  private performanceMarks: Map<string, number> = new Map();
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  };

  constructor() {
    this.flowId = this.getOrCreateFlowId();
    this.paused = localStorage.getItem(STORAGE_KEYS.PAUSED) === 'true';
    this.filters = this.loadFilters();
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };
    this.checkAndEnableFromURL();
    this.recordLastURL();
  }

  /**
   * Check if ?debug=1 is in URL and enable if so
   */
  private checkAndEnableFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1' || params.get('frontendebug') === '1') {
      this.enable();
    }
  }

  /**
   * Check if debugger is enabled
   */
  isEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ENABLED) === 'true';
  }

  /**
   * Enable the debugger
   */
  enable(): void {
    localStorage.setItem(STORAGE_KEYS.ENABLED, 'true');
    this.setupInterceptors();
    this.log('APP', 'debugger_enabled', 'INFO', '');
  }

  /**
   * Disable the debugger
   */
  disable(): void {
    localStorage.setItem(STORAGE_KEYS.ENABLED, 'false');
    this.teardownInterceptors();
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    this.paused = !this.paused;
    localStorage.setItem(STORAGE_KEYS.PAUSED, String(this.paused));
    if (!this.paused) {
      this.log('APP', 'debugger_resumed', 'INFO', '');
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Load filters from storage
   */
  private loadFilters(): DebugFilters {
    const stored = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          categories: new Set(parsed.categories || []),
          levels: new Set(parsed.levels || []),
          searchText: parsed.searchText || '',
        };
      } catch {
        // Fall through to defaults
      }
    }
    
    // Default: show all
    return {
      categories: new Set<LogCategory>(),
      levels: new Set<LogLevel>(),
      searchText: '',
    };
  }

  /**
   * Save filters to storage
   */
  private saveFilters(): void {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify({
      categories: Array.from(this.filters.categories),
      levels: Array.from(this.filters.levels),
      searchText: this.filters.searchText,
    }));
  }

  /**
   * Get current filters
   */
  getFilters(): DebugFilters {
    return { ...this.filters };
  }

  /**
   * Update filters
   */
  setFilters(filters: Partial<DebugFilters>): void {
    if (filters.categories) this.filters.categories = filters.categories;
    if (filters.levels) this.filters.levels = filters.levels;
    if (filters.searchText !== undefined) this.filters.searchText = filters.searchText;
    this.saveFilters();
  }

  /**
   * Get or create flow ID
   */
  private getOrCreateFlowId(): string {
    let flowId = localStorage.getItem(STORAGE_KEYS.FLOW);
    if (!flowId) {
      flowId = this.generateFlowId();
      localStorage.setItem(STORAGE_KEYS.FLOW, flowId);
      this.writeStartBanner(flowId);
    }
    return flowId;
  }

  /**
   * Generate a short UUID for flow tracking
   */
  private generateFlowId(): string {
    return `flow_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Record last URL
   */
  private recordLastURL(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_URL, window.location.href);
  }

  /**
   * Write start banner
   */
  private writeStartBanner(flowId: string): void {
    const banner = `===== FLOW START ${flowId} @ ${new Date().toISOString()} =====`;
    this.appendToLog(banner);
  }

  /**
   * Main logging method
   */
  log(
    category: LogCategory,
    action: string,
    level: LogLevel,
    details: string | Record<string, any>,
    stack?: string
  ): void {
    if (!this.isEnabled() || this.paused) {
      return;
    }

    const detailsStr = typeof details === 'string' 
      ? details 
      : Object.entries(details)
          .map(([k, v]) => `${k}=${this.formatValue(v)}`)
          .join(' ');

    const logLine = [
      new Date().toISOString(),
      `flow=${this.flowId}`,
      `page=${window.location.pathname}`,
      `type=${category}`,
      `action=${action}`,
      `level=${level}`,
      `details=${detailsStr}`,
      stack ? `stack=${stack}` : '',
    ].filter(Boolean).join(' | ');

    this.appendToLog(logLine);
    
    // Also log to console for immediate visibility
    const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
    this.originalConsole[consoleMethod](`[DEBUG] ${category} | ${action} | ${level}`, details);
  }

  /**
   * Format value for logging (no secrets!)
   */
  private formatValue(value: any): string {
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      // Never log sensitive data
      const lower = value.toLowerCase();
      if (lower.includes('token') || lower.includes('password') || 
          lower.includes('secret') || lower.includes('key') ||
          lower.includes('authorization')) {
        return '[REDACTED]';
      }
      // Truncate long strings
      return value.length > 100 ? value.substring(0, 97) + '...' : value;
    }
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (typeof value === 'object') return `[Object]`;
    return String(value);
  }

  /**
   * Append line to log (with ring buffer logic)
   */
  private appendToLog(line: string): void {
    let log = localStorage.getItem(STORAGE_KEYS.LOG) || '';
    const lines = log.split('\n').filter(l => l.trim());
    
    lines.push(line);
    
    // Keep only last MAX_LOG_LINES
    if (lines.length > MAX_LOG_LINES) {
      lines.splice(0, lines.length - MAX_LOG_LINES);
    }
    
    localStorage.setItem(STORAGE_KEYS.LOG, lines.join('\n'));
  }

  /**
   * Get full log
   */
  getLog(): string {
    return localStorage.getItem(STORAGE_KEYS.LOG) || '';
  }

  /**
   * Get log as array of lines
   */
  getLogLines(): string[] {
    const log = this.getLog();
    return log ? log.split('\n').filter(l => l.trim()) : [];
  }

  /**
   * Get filtered log lines
   */
  getFilteredLogLines(): string[] {
    const lines = this.getLogLines();
    
    if (this.filters.categories.size === 0 && 
        this.filters.levels.size === 0 && 
        !this.filters.searchText) {
      return lines;
    }

    return lines.filter(line => {
      // Skip banner lines
      if (line.startsWith('=====')) return true;

      // Category filter
      if (this.filters.categories.size > 0) {
        const match = line.match(/type=(\w+)/);
        if (match && !this.filters.categories.has(match[1] as LogCategory)) {
          return false;
        }
      }

      // Level filter
      if (this.filters.levels.size > 0) {
        const match = line.match(/level=(\w+)/);
        if (match && !this.filters.levels.has(match[1] as LogLevel)) {
          return false;
        }
      }

      // Search text filter
      if (this.filters.searchText) {
        return line.toLowerCase().includes(this.filters.searchText.toLowerCase());
      }

      return true;
    });
  }

  /**
   * Clear log
   */
  clearLog(): void {
    const banner = `===== CLEARED @ ${new Date().toISOString()} =====`;
    localStorage.setItem(STORAGE_KEYS.LOG, banner);
  }

  /**
   * Start new flow
   */
  newFlow(): void {
    this.flowId = this.generateFlowId();
    localStorage.setItem(STORAGE_KEYS.FLOW, this.flowId);
    this.writeStartBanner(this.flowId);
  }

  /**
   * Get current flow ID
   */
  getFlowId(): string {
    return this.flowId;
  }

  /**
   * Copy all logs to clipboard
   */
  async copyToClipboard(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.getLog());
      return true;
    } catch (error) {
      console.error('Failed to copy logs:', error);
      return false;
    }
  }

  /**
   * Export logs as JSON
   */
  exportAsJSON(): string {
    const lines = this.getLogLines();
    const parsed = lines.map(line => {
      if (line.startsWith('=====')) {
        return { type: 'banner', content: line };
      }
      
      const parts: any = {};
      line.split(' | ').forEach(part => {
        const [key, ...valueParts] = part.split('=');
        parts[key.trim()] = valueParts.join('=');
      });
      
      return parts;
    });
    
    return JSON.stringify(parsed, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportAsCSV(): string {
    const lines = this.getLogLines();
    const csv = ['timestamp,flow,page,type,action,level,details'];
    
    lines.forEach(line => {
      if (line.startsWith('=====')) return;
      
      const match = line.match(/^([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)$/);
      if (match) {
        const [, timestamp, flow, page, type, action, level, details] = match;
        csv.push([
          timestamp.trim(),
          flow.replace('flow=', ''),
          page.replace('page=', ''),
          type.replace('type=', ''),
          action.replace('action=', ''),
          level.replace('level=', ''),
          `"${details.replace('details=', '').replace(/"/g, '""')}"`,
        ].join(','));
      }
    });
    
    return csv.join('\n');
  }

  // ===== Interceptors =====

  /**
   * Setup global interceptors
   */
  private setupInterceptors(): void {
    this.interceptConsole();
    this.interceptFetch();
    this.interceptErrors();
    this.interceptStorage();
  }

  /**
   * Teardown interceptors
   */
  private teardownInterceptors(): void {
    // Restore original console methods
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  /**
   * Intercept console methods
   */
  private interceptConsole(): void {
    const self = this;
    
    console.log = function(...args: any[]) {
      self.log('CONSOLE', 'log', 'DEBUG', args.map(a => String(a)).join(' '));
      self.originalConsole.log.apply(console, args);
    };
    
    console.warn = function(...args: any[]) {
      self.log('CONSOLE', 'warn', 'WARN', args.map(a => String(a)).join(' '));
      self.originalConsole.warn.apply(console, args);
    };
    
    console.error = function(...args: any[]) {
      self.log('CONSOLE', 'error', 'ERROR', args.map(a => String(a)).join(' '));
      self.originalConsole.error.apply(console, args);
    };
    
    console.info = function(...args: any[]) {
      self.log('CONSOLE', 'info', 'INFO', args.map(a => String(a)).join(' '));
      self.originalConsole.info.apply(console, args);
    };
  }

  /**
   * Intercept fetch API
   */
  private interceptFetch(): void {
    const self = this;
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args: any[]): Promise<Response> {
      const [url, options = {}] = args;
      const method = options.method || 'GET';
      const hasAuth = !!(options.headers && 
        (options.headers['Authorization'] || options.headers['authorization']));
      
      const startTime = performance.now();
      
      self.log('NETWORK', 'request', 'INFO', {
        method,
        url: self.truncateUrl(String(url)),
        hasAuth,
      });
      
      try {
        const response = await originalFetch.apply(window, args);
        const duration = Math.round(performance.now() - startTime);
        
        let level: LogLevel = 'SUCCESS';
        let category = 'OK';
        
        if (response.status >= 400) {
          level = 'ERROR';
          if (response.status === 401 || response.status === 403) category = 'UNAUTH';
          else if (response.status === 0) category = 'NETWORK';
          else if (!response.ok && response.type === 'opaque') category = 'CORS';
          else category = 'HTTP_ERROR';
        } else if (response.status >= 300) {
          level = 'WARN';
          category = 'REDIRECT';
        }
        
        self.log('NETWORK', 'response', level, {
          method,
          url: self.truncateUrl(String(url)),
          status: response.status,
          category,
          duration: `${duration}ms`,
        });
        
        return response;
      } catch (error: any) {
        const duration = Math.round(performance.now() - startTime);
        
        self.log('NETWORK', 'error', 'ERROR', {
          method,
          url: self.truncateUrl(String(url)),
          error: error.message || 'Network error',
          duration: `${duration}ms`,
        });
        
        throw error;
      }
    };
  }

  /**
   * Intercept global errors
   */
  private interceptErrors(): void {
    window.addEventListener('error', (event) => {
      this.log('ERROR', 'window_error', 'ERROR', {
        message: event.message,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      }, event.error?.stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('ERROR', 'unhandled_rejection', 'ERROR', {
        reason: event.reason?.message || String(event.reason),
      }, event.reason?.stack);
    });
  }

  /**
   * Intercept localStorage/sessionStorage
   */
  private interceptStorage(): void {
    const self = this;
    
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      // Don't log debugger's own storage
      if (!key.startsWith('FRONTEND_DEBUG_')) {
        self.log('STORAGE', 'set', 'DEBUG', {
          type: this === localStorage ? 'localStorage' : 'sessionStorage',
          key,
          size: `${value.length}bytes`,
        });
      }
      originalSetItem.call(this, key, value);
    };
    
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key: string) {
      if (!key.startsWith('FRONTEND_DEBUG_')) {
        self.log('STORAGE', 'remove', 'DEBUG', {
          type: this === localStorage ? 'localStorage' : 'sessionStorage',
          key,
        });
      }
      originalRemoveItem.call(this, key);
    };
  }

  // ===== Convenience methods =====

  /**
   * Log app boot
   */
  logAppBoot(details: { url: string; userAgent: string }): void {
    const ua = this.parseUserAgent(details.userAgent);
    this.log('APP', 'boot', 'INFO', { flow: this.flowId, url: details.url, ua });
  }

  /**
   * Log app ready
   */
  logAppReady(): void {
    this.log('APP', 'ready', 'SUCCESS', 'DOM loaded and app hydrated');
  }

  /**
   * Log route change
   */
  logRouteChange(from: string, to: string): void {
    this.log('ROUTER', 'navigate', 'INFO', { from, to });
  }

  /**
   * Log component mount
   */
  logComponentMount(componentName: string, props?: Record<string, any>): void {
    this.log('COMPONENT', 'mount', 'DEBUG', {
      component: componentName,
      ...(props && { props: JSON.stringify(props) }),
    });
  }

  /**
   * Log component unmount
   */
  logComponentUnmount(componentName: string): void {
    this.log('COMPONENT', 'unmount', 'DEBUG', { component: componentName });
  }

  /**
   * Log component render
   */
  logComponentRender(componentName: string, renderCount?: number): void {
    this.log('COMPONENT', 'render', 'DEBUG', {
      component: componentName,
      ...(renderCount && { count: renderCount }),
    });
  }

  /**
   * Log state change
   */
  logStateChange(context: string, action: string, newValue: any): void {
    this.log('STATE', 'change', 'DEBUG', {
      context,
      action,
      value: this.formatValue(newValue),
    });
  }

  /**
   * Log user event
   */
  logUserEvent(eventType: string, target: string, details?: Record<string, any>): void {
    this.log('EVENT', eventType, 'INFO', {
      target,
      ...details,
    });
  }

  /**
   * Log form submission
   */
  logFormSubmit(formName: string, valid: boolean, errors?: string[]): void {
    this.log('FORM', 'submit', valid ? 'SUCCESS' : 'WARN', {
      form: formName,
      valid,
      ...(errors && { errors: errors.join(', ') }),
    });
  }

  /**
   * Log performance mark
   */
  logPerfMark(name: string): void {
    this.performanceMarks.set(name, performance.now());
    this.log('PERF', 'mark', 'DEBUG', { name });
  }

  /**
   * Log performance measure
   */
  logPerfMeasure(name: string, startMark?: string): void {
    const endTime = performance.now();
    const startTime = startMark ? this.performanceMarks.get(startMark) : null;
    const duration = startTime ? endTime - startTime : 0;
    
    this.log('PERF', 'measure', 'INFO', {
      name,
      duration: `${Math.round(duration)}ms`,
    });
    
    if (startMark) {
      this.performanceMarks.delete(startMark);
    }
  }

  /**
   * Log custom event
   */
  logCustom(action: string, level: LogLevel, details: string | Record<string, any>): void {
    this.log('CUSTOM', action, level, details);
  }

  // ===== Helper methods =====

  private parseUserAgent(ua: string): string {
    if (ua.includes('Chrome')) {
      const match = ua.match(/Chrome\/(\d+)/);
      const version = match ? match[1] : '?';
      const os = ua.includes('Mac') ? 'macOS' : ua.includes('Windows') ? 'Windows' : 'Linux';
      return `Chrome/${version} ${os}`;
    }
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)/);
      const version = match ? match[1] : '?';
      return `Firefox/${version}`;
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      const version = match ? match[1] : '?';
      return `Safari/${version}`;
    }
    return 'Unknown';
  }

  private truncateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname + parsed.search;
      return path.length > 80 ? path.substring(0, 77) + '...' : path;
    } catch {
      return url.substring(0, 80);
    }
  }
}

// Singleton instance
export const frontendDebugger = new FrontendDebugger();

// Also export with backward-compatible name
export const authDebugger = frontendDebugger;
