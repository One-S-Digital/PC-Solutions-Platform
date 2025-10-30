/**
 * Auth Debugger - Comprehensive authentication flow logging
 * 
 * Simple localStorage-based logger that survives reloads/redirects.
 * No IndexedDB, no beacons, no Service Workers.
 */

const STORAGE_KEYS = {
  LOG: 'AUTH_DEBUG_LOG',
  ENABLED: 'AUTH_DEBUG_ENABLED',
  FLOW: 'AUTH_DEBUG_FLOW',
  LAST_URL: 'AUTH_DEBUG_LAST_URL',
  PAUSED: 'AUTH_DEBUG_PAUSED',
} as const;

const MAX_LOG_LINES = 5000;

export type LogCategory = 
  | 'APP' 
  | 'ROUTER' 
  | 'GUARD' 
  | 'SIGNUP' 
  | 'LOGIN' 
  | 'CLERK' 
  | 'HTTP' 
  | 'COOKIE' 
  | 'ERROR' 
  | 'PERF';

export type LogResult = 'OK' | 'ERR' | 'INFO';

interface LogEntry {
  timestamp: string;
  flow: string;
  page: string;
  category: LogCategory;
  action: string;
  result: LogResult;
  details: string;
}

class AuthDebugger {
  private flowId: string;
  private paused: boolean = false;

  constructor() {
    this.flowId = this.getOrCreateFlowId();
    this.paused = localStorage.getItem(STORAGE_KEYS.PAUSED) === 'true';
    this.checkAndEnableFromURL();
    this.recordLastURL();
  }

  /**
   * Check if ?authdebug=1 is in URL and enable if so
   */
  private checkAndEnableFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('authdebug') === '1') {
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
    this.log('APP', 'debugger_enabled', 'INFO', '');
  }

  /**
   * Disable the debugger
   */
  disable(): void {
    localStorage.setItem(STORAGE_KEYS.ENABLED, 'false');
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
    result: LogResult,
    details: string | Record<string, any>
  ): void {
    if (!this.isEnabled() || this.paused) {
      return; // Still log to storage even if paused (UI just doesn't update)
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
      `result=${result}`,
      `details=${detailsStr}`,
    ].join(' | ');

    this.appendToLog(logLine);
    
    // Also log to console for immediate visibility
    const consoleMethod = result === 'ERR' ? 'error' : result === 'OK' ? 'log' : 'info';
    console[consoleMethod](`[AUTH DEBUG] ${category} | ${action} | ${result}`, details);
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
      if (lower.includes('token') || lower.includes('password') || lower.includes('secret')) {
        return '[REDACTED]';
      }
      return value;
    }
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    return JSON.stringify(value);
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

  // ===== Convenience methods for common log patterns =====

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
    this.log('APP', 'ready', 'OK', '');
  }

  /**
   * Log Clerk SDK init
   */
  logClerkInit(success: boolean, error?: string): void {
    this.log('CLERK', 'sdk_init', success ? 'OK' : 'ERR', error || '');
  }

  /**
   * Log Clerk state
   */
  logClerkState(isLoaded: boolean, isSignedIn: boolean): void {
    this.log('CLERK', 'state', 'INFO', { isLoaded, isSignedIn });
  }

  /**
   * Log route enter
   */
  logRouteEnter(path: string): void {
    this.log('ROUTER', 'enter', 'INFO', { path });
  }

  /**
   * Log guard check
   */
  logGuardCheck(
    page: 'public' | 'protected',
    isLoaded: boolean,
    isSignedIn: boolean,
    decision: string,
    reason?: string
  ): void {
    this.log('GUARD', 'check', 'INFO', {
      page,
      isLoaded,
      isSignedIn,
      decision,
      ...(reason && { reason }),
    });
  }

  /**
   * Log router redirect
   */
  logRouterRedirect(from: string, to: string, reason?: string): void {
    this.log('ROUTER', 'redirect', 'INFO', {
      from,
      to,
      ...(reason && { reason }),
    });
  }

  /**
   * Log signup opened
   */
  logSignupOpened(roleDetected: boolean, captchaLoaded: boolean): void {
    this.log('SIGNUP', 'opened', 'INFO', { roleDetected, captchaLoaded });
  }

  /**
   * Log signup submit
   */
  logSignupSubmit(valid: boolean, captchaSolved: boolean): void {
    this.log('SIGNUP', 'submit', 'INFO', { valid, captchaSolved });
  }

  /**
   * Log Clerk signup create
   */
  logClerkSignupCreate(success: boolean, status: string, error?: string): void {
    this.log('CLERK', 'signup_create', success ? 'OK' : 'ERR', {
      status,
      ...(error && { error }),
    });
  }

  /**
   * Log Clerk verify start
   */
  logClerkVerifyStart(): void {
    this.log('CLERK', 'verify_start', 'INFO', '');
  }

  /**
   * Log Clerk verify done
   */
  logClerkVerifyDone(success: boolean, status: string, error?: string): void {
    this.log('CLERK', 'verify_done', success ? 'OK' : 'ERR', {
      status,
      ...(error && { error }),
    });
  }

  /**
   * Log Clerk set active
   */
  logClerkSetActive(success: boolean, error?: string): void {
    this.log('CLERK', 'set_active', success ? 'OK' : 'ERR', error || '');
  }

  /**
   * Log signup redirect
   */
  logSignupRedirect(to: string): void {
    this.log('SIGNUP', 'redirect_after', 'INFO', { to });
  }

  /**
   * Log login opened
   */
  logLoginOpened(provider: string): void {
    this.log('LOGIN', 'opened', 'INFO', { provider });
  }

  /**
   * Log Clerk signin create
   */
  logClerkSigninCreate(success: boolean, status: string, error?: string): void {
    this.log('CLERK', 'signin_create', success ? 'OK' : 'ERR', {
      status,
      ...(error && { error }),
    });
  }

  /**
   * Log login redirect
   */
  logLoginRedirect(to: string): void {
    this.log('LOGIN', 'redirect_after', 'INFO', { to });
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(method: string, url: string, authHeader: boolean): void {
    this.log('HTTP', 'req', 'INFO', {
      method,
      url: this.truncateUrl(url),
      authHeader,
    });
  }

  /**
   * Log HTTP response
   */
  logHttpResponse(
    status: number,
    category: 'OK' | 'UNAUTH' | 'CORS' | 'NETWORK'
  ): void {
    const result = category === 'OK' ? 'OK' : 'ERR';
    this.log('HTTP', 'res', result, { status, category });
  }

  /**
   * Log cookie snapshot
   */
  logCookieSnapshot(cookiesEnabled: boolean, sameOrigin: boolean): void {
    this.log('COOKIE', 'snapshot', 'INFO', { cookiesEnabled, sameOrigin });
  }

  /**
   * Log window error
   */
  logWindowError(message: string, source: string): void {
    this.log('ERROR', 'window_error', 'ERR', { message, source });
  }

  /**
   * Log unhandled rejection
   */
  logUnhandledRejection(reason: string): void {
    this.log('ERROR', 'unhandled_rejection', 'ERR', { reason });
  }

  /**
   * Log Clerk load error
   */
  logClerkLoadError(hint: string): void {
    this.log('ERROR', 'clerk_load', 'ERR', { hint });
  }

  /**
   * Log performance mark
   */
  logPerfMark(name: string): void {
    this.log('PERF', 'mark', 'INFO', { name });
  }

  /**
   * Log performance measure
   */
  logPerfMeasure(name: string, ms: number): void {
    this.log('PERF', 'measure', 'INFO', { name, ms });
  }

  // ===== Helper methods =====

  private parseUserAgent(ua: string): string {
    // Simple UA parsing for common browsers
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
      return parsed.pathname + parsed.search;
    } catch {
      return url.substring(0, 50);
    }
  }
}

// Singleton instance
export const authDebugger = new AuthDebugger();
