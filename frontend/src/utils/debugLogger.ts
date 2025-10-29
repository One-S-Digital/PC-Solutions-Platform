/**
 * Debug Logger Utility
 * Persists debug logs across page reloads using localStorage
 */

interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: DebugLogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private storageKey = 'pc-solutions-debug-logs';

  private constructor() {
    this.loadLogs();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load debug logs from localStorage:', error);
    }
  }

  private saveLogs(): void {
    try {
      // Keep only the last maxLogs entries
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save debug logs to localStorage:', error);
    }
  }

  private addLog(level: DebugLogEntry['level'], category: string, message: string, data?: any): void {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    this.saveLogs();

    // Also log to console for immediate visibility
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    const prefix = `[${category}] ${message}`;
    
    if (data !== undefined) {
      console[consoleMethod](prefix, data);
    } else {
      console[consoleMethod](prefix);
    }
  }

  info(category: string, message: string, data?: any): void {
    this.addLog('info', category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.addLog('warn', category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.addLog('error', category, message, data);
  }

  debug(category: string, message: string, data?: any): void {
    this.addLog('debug', category, message, data);
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: string): DebugLogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
  }

  // Method to display all logs in console
  displayAllLogs(): void {
    console.group('🔍 [DEBUG LOGGER] All Stored Logs');
    this.logs.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const prefix = `[${timestamp}] [${log.category}] ${log.message}`;
      
      if (log.data !== undefined) {
        console.log(prefix, log.data);
      } else {
        console.log(prefix);
      }
    });
    console.groupEnd();
  }

  // Method to display logs by category
  displayLogsByCategory(category: string): void {
    const categoryLogs = this.getLogsByCategory(category);
    console.group(`🔍 [DEBUG LOGGER] ${category} Logs`);
    categoryLogs.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const prefix = `[${timestamp}] ${log.message}`;
      
      if (log.data !== undefined) {
        console.log(prefix, log.data);
      } else {
        console.log(prefix);
      }
    });
    console.groupEnd();
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Export types for use in components
export type { DebugLogEntry };

// Make debugLogger available globally for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
}