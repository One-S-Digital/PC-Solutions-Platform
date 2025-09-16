import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

const AUTH_REQUESTS_LIMIT = 5;
const AUTH_TTL_SECONDS = 60;
const UPLOAD_REQUESTS_LIMIT = 10;
const UPLOAD_TTL_SECONDS = 60;

export const AuthThrottle = () => applyDecorators(Throttle(AUTH_REQUESTS_LIMIT, AUTH_TTL_SECONDS));
export const UploadThrottle = () => applyDecorators(Throttle(UPLOAD_REQUESTS_LIMIT, UPLOAD_TTL_SECONDS));
