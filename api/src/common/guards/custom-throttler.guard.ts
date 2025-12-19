import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom ThrottlerGuard that properly respects @SkipThrottle() decorator
 * and excludes static-translation routes from rate limiting
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for static-translation routes
    const request = context.switchToHttp().getRequest();
    const url = request.url || '';

    if (url.includes('/static-translations/')) {
      return true;
    }

    // For all other routes, use the parent's throttling logic
    // which will respect @SkipThrottle() decorator
    return super.canActivate(context);
  }
}

