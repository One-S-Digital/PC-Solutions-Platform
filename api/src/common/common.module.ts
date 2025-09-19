import { Module, Global } from '@nestjs/common';
import { AppLoggerService } from './logger.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Global()
@Module({
  providers: [
    AppLoggerService,
    RequestIdMiddleware,
    RequestLoggerMiddleware,
    GlobalExceptionFilter,
  ],
  exports: [AppLoggerService],
})
export class CommonModule {}