import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // CORS configuration - more defensive approach
  // Check NODE_ENV (case-insensitive) and also check if we're on Render
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.NODE_ENV === 'PRODUCTION' ||
                       process.env.RENDER === 'true';
  
  const allowedOrigins = isProduction
    ? [
        'https://app.procrechesolutions.com', 
        'https://admin.procrechesolutions.com'
      ]
    : true;

  // Log CORS configuration for debugging
  console.log('🔧 CORS Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    RENDER: process.env.RENDER,
    isProduction,
    allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins : 'ALL (dev mode)',
  });

  // Trigger deployment to run database migrations
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We'll handle body parsing manually
    cors: {
      origin: allowedOrigins,
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
      ],
      exposedHeaders: ['Content-Type', 'Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });
  const logger = app.get(AppLoggerService);
  
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
    crossOriginResourcePolicy: { policy: "cross-origin" },
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

  // Set global prefix
  app.setGlobalPrefix('api');

  // Manual CORS middleware as fallback (ensures CORS headers are always set)
  // This runs before the root handlers to ensure CORS is applied to all routes
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (isProduction && Array.isArray(allowedOrigins)) {
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // Development mode - allow all origins
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    
    // Set CORS headers for preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, svix-id, svix-timestamp, svix-signature');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      return res.status(204).end();
    }
    
    next();
  });

  // CORS debugging middleware (only when DEBUG_CORS is enabled)
  if (process.env.DEBUG_CORS === 'true') {
    app.use((req, res, next) => {
      const isPreflight = req.method === 'OPTIONS';
      
      if (isPreflight || req.method === 'PUT' || req.method === 'PATCH') {
        logger.debug('CORS Request', 'CORSMiddleware', {
          method: req.method,
          url: req.url,
          origin: req.headers.origin,
          isPreflight,
        });
      }
      
      next();
    });
  }

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
  
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}
bootstrap();
