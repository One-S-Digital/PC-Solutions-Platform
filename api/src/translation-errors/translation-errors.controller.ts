import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { TranslationErrorsService } from './translation-errors.service';

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

@Controller('translation-errors')
export class TranslationErrorsController {
  private readonly logger = new Logger(TranslationErrorsController.name);

  constructor(private readonly translationErrorsService: TranslationErrorsService) {}

  @Post()
  async logTranslationErrors(@Body() errorLog: TranslationErrorLog) {
    try {
      this.logger.log(`Received translation error log: ${errorLog.totalErrors} errors for ${errorLog.language}`);
      
      const result = await this.translationErrorsService.logErrors(errorLog);
      
      return {
        success: true,
        message: 'Translation errors logged successfully',
        logFile: result.logFile,
        errorsLogged: errorLog.totalErrors
      };
    } catch (error) {
      this.logger.error('Failed to log translation errors:', error);
      return {
        success: false,
        message: 'Failed to log translation errors',
        error: error.message
      };
    }
  }

  @Get('commit-logs')
  async commitLogs() {
    try {
      const result = await this.translationErrorsService.commitLogsToGit();
      return {
        success: true,
        message: 'Translation error logs committed to git',
        ...result
      };
    } catch (error) {
      this.logger.error('Failed to commit logs to git:', error);
      return {
        success: false,
        message: 'Failed to commit logs to git',
        error: error.message
      };
    }
  }
}