import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly authorizedParties: string[];
  private readonly authDebug: boolean;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {
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

    // Enable verbose logging when diagnosing auth (set AUTH_DEBUG=true)
    this.authDebug = (this.configService.get<string>('AUTH_DEBUG') || '').toLowerCase() === 'true';
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
      // Let Clerk's SDK automatically detect issuer from token and fetch JWKS
      // This ensures we always use the correct issuer from the token itself
      const options: any = {
        authorizedParties: this.authorizedParties.length > 0 ? this.authorizedParties : undefined,
        clockSkewInMs: 60_000,
      };

      // Debug logging (only if AUTH_DEBUG=true)
      if (this.authDebug) {
        const decodeBase64Url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        const [rawHeader, rawPayload] = token.split('.');
        let decodedHeader: any = undefined;
        let decodedPayload: any = undefined;
        try {
          decodedHeader = JSON.parse(decodeBase64Url(rawHeader));
          decodedPayload = JSON.parse(decodeBase64Url(rawPayload));
        } catch {}

        const req = context.switchToHttp().getRequest();
        console.log('🔐 Auth Debug:', {
          path: req.url,
          method: req.method,
          tokenIssuer: decodedPayload?.iss,
          tokenAzp: decodedPayload?.azp,
          tokenAud: decodedPayload?.aud,
          tokenKid: decodedHeader?.kid,
          authorizedParties: this.authorizedParties,
        });
      }

      const payload = await verifyToken(token, options);
      
      // Store minimal info - Clerk user ID
      request.clerk = { userId: payload.sub };

      // Populate request.context (user role from AppUser), so RolesGuard can authorize
      try {
        let appUser = await this.prisma.appUser.findUnique({ where: { clerkId: payload.sub } });
        if (!appUser) {
          if (this.authDebug) {
            console.log('🔐 Auth Debug: AppUser missing, user may be pending webhook processing', { userId: payload.sub });
          }
          // Don't create AppUser here - let webhook handle it
          // Set minimal context for pending users
          request.context = {
            userId: payload.sub,
            role: 'PENDING',
            appUserId: null,
            clerkUserId: payload.sub,
            isPending: true,
          };
          // FIX: Also set request.user for backward compatibility with UsersController
          request.user = {
            clerkId: payload.sub,
            role: 'PENDING',
            id: null,
            isPending: true,
          };
          if (this.authDebug) {
            console.log('🔐 Auth Debug: request.context and request.user set for pending user', { context: request.context, user: request.user });
          }
        } else {
          request.context = {
            userId: payload.sub,
            role: appUser.role,
            appUserId: appUser.id,
            clerkUserId: payload.sub,
          };
          // FIX: Also set request.user for backward compatibility with UsersController
          request.user = {
            clerkId: payload.sub,
            role: appUser.role,
            id: appUser.id,
          };
          if (this.authDebug) {
            console.log('🔐 Auth Debug: request.context and request.user populated', { context: request.context, user: request.user });
          }
        }
      } catch (e) {
        if (this.authDebug) {
          console.error('🔐 Auth Debug: failed to load AppUser', e);
        }
        // non-fatal; RolesGuard will handle missing context
      }
      return true;
    } catch (error: any) {
      const reason = error?.reason || error?.message || 'unknown';
      
      // Only log errors in debug mode to reduce noise
      if (this.authDebug) {
        console.error('Token verification failed:', { reason, action: error?.action });
      }
      
      throw new UnauthorizedException('Invalid token');
    }
  }
}