import { Params } from 'nestjs-pino';

/**
 * Pino logger configuration for NestJS
 */
export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    
    // Pretty print in development, JSON in production
    transport: process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        }
      : undefined,

    // Custom request/response serializers
    serializers: {
      req: (req: any) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        userId: req.user?.id,
        // Don't log sensitive headers or body
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
      err: (err: any) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      }),
    },

    // Custom properties attached to every log
    customProps: (req: any, res: any) => ({
      traceId: req.id,
      userId: req.user?.id,
      context: 'HTTP',
    }),

    // Custom log level based on status code
    customLogLevel: (req: any, res: any, err: any) => {
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      if (res.statusCode >= 300) {
        return 'info';
      }
      return 'info';
    },

    // Custom success message
    customSuccessMessage: (req: any, res: any) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },

    // Custom error message
    customErrorMessage: (req: any, res: any, err: any) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },

    // Auto-log requests
    autoLogging: true,

    // Don't log these paths (noise reduction)
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'duration',
    },
  },
};

/**
 * Paths to exclude from logging (health checks, etc.)
 */
export const excludePaths = [
  '/health',
  '/metrics',
  '/favicon.ico',
];
