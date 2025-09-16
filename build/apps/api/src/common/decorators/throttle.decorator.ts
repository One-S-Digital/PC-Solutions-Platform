import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export const AUTH_THROTTLE_KEY = 'auth';
export const UPLOAD_THROTTLE_KEY = 'upload';

export const AUTH_REQUESTS_LIMIT = 5;
export const AUTH_TTL_SECONDS = 60;
export const UPLOAD_REQUESTS_LIMIT = 10;
export const UPLOAD_TTL_SECONDS = 60;

export const AuthThrottle = () =>
  applyDecorators(
    Throttle({
      [AUTH_THROTTLE_KEY]: {
        limit: AUTH_REQUESTS_LIMIT,
        ttl: AUTH_TTL_SECONDS,
      },
    }),
  );

export const UploadThrottle = () =>
  applyDecorators(
    Throttle({
      [UPLOAD_THROTTLE_KEY]: {
        limit: UPLOAD_REQUESTS_LIMIT,
        ttl: UPLOAD_TTL_SECONDS,
      },
    }),
  );

