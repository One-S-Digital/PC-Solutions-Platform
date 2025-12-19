import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface TranslationErrorLog {
  timestamp: string;
  language: string;
  totalErrors: number;
  errors: Array<{
    key: string;
    returned: string;
    expected: string;
    timestamp: string;
    language: string;
    page: string;
    severity: 'missing' | 'fallback' | 'error';
  }>;
  summary: {
    missingKeys: number;
    fallbackKeys: number;
    errorKeys: number;
  };
  userAgent?: string;
  url?: string;
  referrer?: string;
}

@Injectable()
export class TranslationErrorsService {
  private readonly logger = new Logger(TranslationErrorsService.name);
  private readonly logsDir = join(process.cwd(), 'logs', 'translation-errors');

  constructor() {
    // Ensure logs directory exists
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  async logErrors(errorLog: TranslationErrorLog) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const language = errorLog.language || 'unknown';
    const logFileName = `translation-errors-${language}-${timestamp}.json`;
    const logFilePath = join(this.logsDir, logFileName);

    try {
      // Create detailed log entry
      const logEntry = {
        ...errorLog,
        loggedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        serverTime: new Date().toISOString()
      };

      // Write individual log file
      writeFileSync(logFilePath, JSON.stringify(logEntry, null, 2));

      // Append to daily summary log
      const dailyLogFile = join(this.logsDir, `daily-${new Date().toISOString().split('T')[0]}.log`);
      const summaryEntry = {
        timestamp: errorLog.timestamp,
        language,
        totalErrors: errorLog.totalErrors,
        missingKeys: errorLog.summary.missingKeys,
        fallbackKeys: errorLog.summary.fallbackKeys,
        errorKeys: errorLog.summary.errorKeys,
        page: errorLog.errors[0]?.page || 'unknown',
        url: errorLog.url,
        userAgent: errorLog.userAgent
      };

      appendFileSync(dailyLogFile, JSON.stringify(summaryEntry) + '\n');

      // Create/update master error summary
      await this.updateMasterErrorSummary(errorLog);

      this.logger.log(`Translation errors logged to: ${logFilePath}`);
      
      return {
        logFile: logFileName,
        totalErrors: errorLog.totalErrors,
        language
      };
    } catch (error) {
      this.logger.error('Failed to write translation error log:', error);
      throw error;
    }
  }

  private async updateMasterErrorSummary(errorLog: TranslationErrorLog) {
    const masterSummaryFile = join(this.logsDir, 'master-error-summary.json');
    
    try {
      let masterSummary = {
        lastUpdated: new Date().toISOString(),
        totalErrorsLogged: 0,
        errorsByLanguage: {} as Record<string, number>,
        errorsByPage: {} as Record<string, number>,
        errorsBySeverity: {
          missing: 0,
          fallback: 0,
          error: 0
        },
        recentErrors: [] as any[]
      };

      // Load existing summary if it exists
      if (existsSync(masterSummaryFile)) {
        const existingData = JSON.parse(require('fs').readFileSync(masterSummaryFile, 'utf8'));
        masterSummary = { ...masterSummary, ...existingData };
      }

      // Update summary with new errors
      masterSummary.lastUpdated = new Date().toISOString();
      masterSummary.totalErrorsLogged += errorLog.totalErrors;
      
      // Update language counts
      masterSummary.errorsByLanguage[errorLog.language] = 
        (masterSummary.errorsByLanguage[errorLog.language] || 0) + errorLog.totalErrors;
      
      // Update page counts
      errorLog.errors.forEach(error => {
        masterSummary.errorsByPage[error.page] = 
          (masterSummary.errorsByPage[error.page] || 0) + 1;
      });
      
      // Update severity counts
      masterSummary.errorsBySeverity.missing += errorLog.summary.missingKeys;
      masterSummary.errorsBySeverity.fallback += errorLog.summary.fallbackKeys;
      masterSummary.errorsBySeverity.error += errorLog.summary.errorKeys;
      
      // Add recent errors (keep last 50)
      masterSummary.recentErrors.unshift({
        timestamp: errorLog.timestamp,
        language: errorLog.language,
        totalErrors: errorLog.totalErrors,
        page: errorLog.errors[0]?.page || 'unknown',
        errors: errorLog.errors.slice(0, 10) // Keep first 10 errors as sample
      });
      
      masterSummary.recentErrors = masterSummary.recentErrors.slice(0, 50);

      // Write updated summary
      writeFileSync(masterSummaryFile, JSON.stringify(masterSummary, null, 2));
      
    } catch (error) {
      this.logger.warn('Failed to update master error summary:', error);
    }
  }

  async commitLogsToGit() {
    try {
      const gitDir = process.cwd();
      const logDir = this.logsDir;
      
      // Check if there are any log files
      if (!existsSync(logDir) || !require('fs').readdirSync(logDir).length) {
        return {
          message: 'No log files to commit',
          filesCommitted: 0
        };
      }

      // Add all log files to git
      execSync(`git add ${logDir}/*`, { cwd: gitDir, stdio: 'pipe' });
      
      // Check if there are changes to commit
      try {
        execSync('git diff --staged --quiet', { cwd: gitDir, stdio: 'pipe' });
        return {
          message: 'No new log files to commit',
          filesCommitted: 0
        };
      } catch (error) {
        // There are changes to commit
      }

      // Commit the log files
      const timestamp = new Date().toISOString();
      const commitMessage = `feat: add translation error logs - ${timestamp}

## Translation Error Logs Added:
- Individual error log files
- Daily summary logs  
- Master error summary
- Error counts by language, page, and severity
- Recent errors tracking

These logs help identify and fix translation issues systematically.`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: gitDir, stdio: 'pipe' });

      // Get list of committed files
      const committedFiles = execSync('git diff --name-only HEAD~1', { cwd: gitDir, encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file.includes('translation-errors'));

      this.logger.log(`Successfully committed ${committedFiles.length} translation log files to git`);

      return {
        message: 'Translation error logs committed successfully',
        filesCommitted: committedFiles.length,
        files: committedFiles
      };
    } catch (error) {
      this.logger.error('Failed to commit logs to git:', error);
      throw error;
    }
  }
}