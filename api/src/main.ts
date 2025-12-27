// Import Sentry instrumentation first, before any other imports
import './sentry.instrument';
import { initSentry } from './sentry.instrument';

// Initialize Sentry
initSentry();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  // Trigger deployment to run database migrations
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We'll handle body parsing manually
  });
  const logger = app.get(AppLoggerService);
  
  // CORS configuration - MUST run before helmet
  const prodAllowed = new Set([
    'https://app.procrechesolutions.com',
    'https://admin.procrechesolutions.com',
  ]);

  app.enableCors({
    origin: (origin, cb) => {
      // Allow non-browser clients (curl/postman) with no Origin header
      if (!origin) return cb(null, true);

      // In non-production, allow all origins for easier testing
      if (process.env.NODE_ENV !== 'production') return cb(null, true);

      // In production, only allow known origins
      return cb(null, prodAllowed.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'svix-id',
      'svix-timestamp',
      'svix-signature',
      'X-Trace-Id',
    ],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-build-commit', 'X-Trace-Id'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  });
  
  // Raw body for webhook route
  app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }));
  
  // Webhook body parsing debug middleware (only in development or when DEBUG_WEBHOOKS is enabled)
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_WEBHOOKS === 'true') {
    app.use('/api/webhooks/clerk', (req, res, next) => {
      logger.debug('Webhook request intercepted', 'WebhookMiddleware', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      });
      next();
    });
  }
  
  // JSON parser for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));
  // Resolve compression middleware across CJS/ESM export shapes
  let compressionFn: any;
  try {
     
    const mod = require('compression');
    compressionFn = (mod && mod.default) ? mod.default : mod;
  } catch (err) {
    const mod = await import('compression');
    // @ts-ignore - runtime shape detection
    compressionFn = (mod && (mod as any).default) ? (mod as any).default : (mod as any);
  }
  app.use(compressionFn());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formatted = errors.map((error) => ({
          field: error.property,
          value: error.value,
          constraints: error.constraints,
          children: error.children,
        }));
        console.error('🔴 Global Validation Error:', JSON.stringify(formatted, null, 2));
        return new BadRequestException({
          message: 'Validation failed',
          errors: formatted,
        });
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Add Sentry exception filter for error tracking (should be added after AllExceptionsFilter)
  if (process.env.SENTRY_DSN) {
    app.useGlobalFilters(new SentryExceptionFilter());
  }

  // Set global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PC Solutions API')
      .setDescription('API for the PC Solutions platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Root handlers for Render's default probes
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.head('/', (_req, res) => res.sendStatus(204));
  expressApp.get('/', (_req, res) => res.sendStatus(204));

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Render

  // Log route map once at startup for debugging
  try {
    const server = app.getHttpServer();
    const router = (server as any)?._events?.request?._router;
    if (router?.stack) {
      const routes = router.stack
        .filter((l: any) => l.route)
        .map(
          (l: any) =>
            Object.keys(l.route.methods)
              .map((m) => m.toUpperCase())
              .join(',') +
            ' ' +
            l.route.path,
        );
      logger.log(`ROUTES: ${JSON.stringify(routes)}`, 'Bootstrap');
    }
  } catch (e) {
    logger.error('Failed to log route map', (e as any)?.message || e);
  }

  logger.log(`Application is running on port ${port}`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}
bootstrap();
