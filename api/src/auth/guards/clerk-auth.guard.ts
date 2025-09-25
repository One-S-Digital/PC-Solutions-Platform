import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly authorizedParties: string[];

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

    // Authorized parties are the frontend origins that will mint tokens (azp)
    const adminOrigin = this.configService.get<string>('ADMIN_ORIGIN');
    const appOrigin = this.configService.get<string>('APP_ORIGIN');
    const extraAzp = this.configService.get<string>('AUTHORIZED_PARTIES'); // comma-separated
    const azpList = [adminOrigin, appOrigin]
      .filter((v): v is string => !!v && v.trim().length > 0);
    if (extraAzp) {
      azpList.push(
        ...extraAzp
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      );
    }
    this.authorizedParties = azpList;
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
        // Accept tokens minted by our frontends (azp matches origins)
        authorizedParties: this.authorizedParties.length > 0 ? this.authorizedParties : undefined,
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