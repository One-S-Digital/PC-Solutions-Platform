import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ApiEnvelopeDto } from '../dto/api-envelope.dto';

/**
 * Configure Swagger/OpenAPI documentation
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('PC Solutions V2 API')
    .setDescription(
      'API for ProCrèche Solutions Suisse - Childcare Management Platform\n\n' +
      '## Response Format\n' +
      'All responses are wrapped in a standard envelope:\n' +
      '```json\n' +
      '{\n' +
      '  "success": true,\n' +
      '  "version": 1,\n' +
      '  "timestamp": "2025-10-11T10:30:00.000Z",\n' +
      '  "data": { ... }\n' +
      '}\n' +
      '```\n\n' +
      '## Error Format\n' +
      'Errors follow a consistent structure:\n' +
      '```json\n' +
      '{\n' +
      '  "success": false,\n' +
      '  "version": 1,\n' +
      '  "timestamp": "2025-10-11T10:30:00.000Z",\n' +
      '  "error": {\n' +
      '    "code": "NOT_FOUND",\n' +
      '    "message": "Resource not found",\n' +
      '    "details": { ... }\n' +
      '  },\n' +
      '  "traceId": "abc-123-xyz"\n' +
      '}\n' +
      '```\n\n' +
      '## Authentication\n' +
      'Use Bearer token in Authorization header:\n' +
      '`Authorization: Bearer <clerk-jwt-token>`'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Clerk JWT token',
      },
      'JWT'
    )
    .addTag('Health', 'Health check and system status endpoints')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Content', 'Content management')
    .addTag('Policy Alerts', 'Policy alerts and notifications')
    .addTag('Platform Settings', 'Platform configuration')
    .addTag('E-Learning', 'Course and learning management')
    .addTag('Admin - Audit Logs', 'Audit trail and compliance')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiEnvelopeDto],
    deepScanRoutes: true,
  });

  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Serve OpenAPI JSON
  return document;
}

/**
 * Helper to create envelope response schema for Swagger
 */
export function createEnvelopeSchema(dataSchemaRef: string) {
  return {
    allOf: [
      { $ref: '#/components/schemas/ApiEnvelopeDto' },
      {
        properties: {
          data: { $ref: dataSchemaRef },
        },
      },
    ],
  };
}
