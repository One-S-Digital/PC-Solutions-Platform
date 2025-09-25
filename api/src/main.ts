import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppLoggerService } from './common/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We'll handle body parsing manually
  });
  const logger = app.get(AppLoggerService);
  
  // Raw body for webhook route
  app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }));
  
  // JSON parser for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet());
  app.use(compression());

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

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [
          'https://app.procrechesolutions.com', 
          'https://admin.procrechesolutions.com'
        ]
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // CORS debugging middleware
  app.use((req, res, next) => {
    console.log('🔧 CORS Debug:', {
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? ['https://app.procrechesolutions.com', 'https://admin.procrechesolutions.com']
        : 'all'
    });
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

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Render
  
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
  console.log(`Server started on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}
bootstrap();
