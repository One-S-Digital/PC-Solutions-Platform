import { Module } from '@nestjs/common';
import { TranslationErrorsController } from './translation-errors.controller';
import { TranslationErrorsService } from './translation-errors.service';
import { TranslationErrorsScheduler } from './translation-errors.scheduler';

@Module({
  controllers: [TranslationErrorsController],
  providers: [TranslationErrorsService, TranslationErrorsScheduler],
  exports: [TranslationErrorsService]
})
export class TranslationErrorsModule {}