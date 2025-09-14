import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const requestId = req.id;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      };

      if (res.statusCode >= 400) {
        this.logger.warn('HTTP Request', 'RequestLogger', logData);
      } else {
        this.logger.log('HTTP Request', 'RequestLogger', logData);
      }
    });

    next();
  }
}