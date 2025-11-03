import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppLoggerService } from './common/logger.service';

async function bootstrap() {
  // Trigger deployment to run database migrations
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We'll handle body parsing manually
  });
  const logger = app.get(AppLoggerService);
  
  // Webhook body parsing debug middleware
  app.use('/api/webhooks/clerk', (req, res, next) => {
    console.log('🔍 [WEBHOOK BODY DEBUG] Clerk webhook request intercepted');
    console.log('🔍 [WEBHOOK BODY DEBUG] Before raw parser:', {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasBody: !!(req as any).body,
      bodyType: typeof (req as any).body,
    });
    next();
  });
  
  // Raw body for webhook route
  app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }));
  
  // Webhook body parsing verification middleware
  app.use('/api/webhooks/clerk', (req, res, next) => {
    console.log('🔍 [WEBHOOK BODY DEBUG] After raw parser:', {
      hasBody: !!(req as any).body,
      bodyType: typeof (req as any).body,
      bodyConstructor: (req as any).body?.constructor?.name,
      bodyLength: (req as any).body?.length || 0,
      isBuffer: Buffer.isBuffer((req as any).body),
      bodyPreview: (req as any).body ? String((req as any).body).substring(0, 200) : 'EMPTY',
    });
    next();
  });
  
  // JSON parser for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet());
  // Resolve compression middleware across CJS/ESM export shapes
  let compressionFn: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Set global prefix
  app.setGlobalPrefix('api');

  // CORS - Enhanced configuration
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://app.procrechesolutions.com', 
        'https://admin.procrechesolutions.com'
      ]
    : true;

  app.enableCors({
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
  });

  // Prevent conditional caching on API routes to avoid 304 responses for identity-dependent endpoints
  app.use('/api', (req, res, next) => {
    if (req.headers) {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    next();
  });

  // CORS debugging middleware (ALWAYS enabled to debug production issues)
  app.use((req, res, next) => {
    const isPreflight = req.method === 'OPTIONS';
    
    if (isPreflight || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('🌐 CORS Request:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        isPreflight,
        headers: {
          'access-control-request-method': req.headers['access-control-request-method'],
          'access-control-request-headers': req.headers['access-control-request-headers'],
        },
        allowedOrigins: typeof allowedOrigins === 'boolean' ? 'all' : allowedOrigins,
      });
    }
    
    next();
  });

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
  console.log(`Server started on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}
bootstrap();
