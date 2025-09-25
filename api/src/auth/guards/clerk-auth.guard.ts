import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly issuer: string;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    // Determine issuer based on Clerk instance
    const publishableKey = this.configService.get<string>('CLERK_PUBLISHABLE_KEY', '');
    if (publishableKey.includes('test')) {
      // Extract instance ID from test key: pk_test_<instance-id>
      const instanceId = publishableKey.split('_')[2]?.split('.')[0];
      this.issuer = `https://${instanceId}.clerk.accounts.dev`;
    } else {
      // Production or custom domain
      this.issuer = this.configService.get<string>('CLERK_ISSUER', 'https://clerk.yourdomain.com');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.slice(7);
    
    try {
      const payload = await verifyToken(token, {
        authorizedParties: [this.issuer],
        clockSkewInMs: 60_000, // 1 minute clock skew tolerance
      });
      
      // Store minimal info - just the Clerk user ID
      request.clerk = { userId: payload.sub };
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}