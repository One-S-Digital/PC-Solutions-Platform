import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntitlementMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    
    if (!user) {
      return next();
    }

    // Check if user has active subscription or license
    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
        status: {
          // Stripe statuses are lowercase strings ('active', 'trialing', ...)
          // but historical data may contain uppercase. Support both.
          in: ['active', 'trialing', 'ACTIVE', 'TRIALING', 'TRIAL', 'trial'],
        },
      },
    });

    const activeLicense = await this.prisma.license.findFirst({
      where: {
        userId: user.id,
        status: 'active',
        accessExpiresAt: {
          gt: new Date(),
        },
      },
    });

    const isEntitled = !!(activeSubscription || activeLicense);

    // Add entitlement info to request
    (req as any).entitlement = {
      isEntitled,
      subscription: activeSubscription,
      license: activeLicense,
    };

    next();
  }
}

// Decorator to check entitlement
export function RequireEntitlement() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const req = args[0];
      const entitlement = (req as any).entitlement;

      if (!entitlement?.isEntitled) {
        throw new ForbiddenException('Subscription required to access this feature');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}