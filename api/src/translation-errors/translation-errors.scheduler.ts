import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TranslationErrorsService } from './translation-errors.service';

@Injectable()
export class TranslationErrorsScheduler {
  private readonly logger = new Logger(TranslationErrorsScheduler.name);

  constructor(private readonly translationErrorsService: TranslationErrorsService) {}

  // Commit translation error logs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async commitTranslationLogs() {
    try {
      this.logger.log('Starting scheduled commit of translation error logs...');
      
      const result = await this.translationErrorsService.commitLogsToGit();
      
      if (result.filesCommitted > 0) {
        this.logger.log(`Successfully committed ${result.filesCommitted} translation log files to git`);
      } else {
        this.logger.log('No new translation log files to commit');
      }
    } catch (error) {
      this.logger.error('Failed to commit translation logs:', error);
    }
  }

  // Also commit logs every 6 hours as a backup
  @Cron('0 */6 * * *')
  async commitTranslationLogsBackup() {
    try {
      this.logger.log('Starting backup commit of translation error logs...');
      
      const result = await this.translationErrorsService.commitLogsToGit();
      
      if (result.filesCommitted > 0) {
        this.logger.log(`Backup commit: Successfully committed ${result.filesCommitted} translation log files to git`);
      }
    } catch (error) {
      this.logger.error('Failed to commit translation logs (backup):', error);
    }
  }
}