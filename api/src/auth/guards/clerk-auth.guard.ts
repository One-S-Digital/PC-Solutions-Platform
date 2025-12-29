import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly authorizedParties: string[];
  private readonly jwtKey?: string;
  private readonly authDebug: boolean;
  private readonly secretKey: string;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {
    // Get Clerk secret key
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY', '');
    if (!this.secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

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

    // Optional static JWT verification key (PEM) for offline verification
    this.jwtKey = this.configService.get<string>('CLERK_JWT_KEY');

    // Enable verbose logging when diagnosing auth
    this.authDebug = (this.configService.get<string>('AUTH_DEBUG') || '').toLowerCase() === 'true';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Allow OPTIONS requests (CORS preflight) - they don't have auth headers
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    const authHeader = request.headers['authorization'];
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.slice(7);

    // Decode token header/payload without verifying for diagnostics
    const decodeBase64Url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const [rawHeader, rawPayload] = token.split('.');
    let decodedHeader: any = undefined;
    let decodedPayload: any = undefined;
    try {
      decodedHeader = JSON.parse(decodeBase64Url(rawHeader));
      decodedPayload = JSON.parse(decodeBase64Url(rawPayload));
    } catch {}
    
    try {
      const options: any = {
        secretKey: this.secretKey,
        authorizedParties: this.authorizedParties.length > 0 ? this.authorizedParties : undefined,
        clockSkewInMs: 60_000,
      };
      // Prefer issuer from token if present, else fall back
      if (decodedPayload?.iss) {
        options.issuer = decodedPayload.iss;
      } else if (this.issuer) {
        options.issuer = this.issuer;
      }
      if (this.jwtKey) {
        options.jwtKey = this.jwtKey;
      }

      if (this.authDebug) {
        const req = context.switchToHttp().getRequest();
         
        console.log('🔐 Auth Debug:', {
          path: req.url,
          method: req.method,
          hasSecretKey: !!this.secretKey,
          hasJwtKey: !!this.jwtKey,
          configuredIssuer: this.issuer,
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
        const appUser = await this.prisma.appUser.findUnique({ where: { clerkId: payload.sub } });
        
        // Also fetch the User profile record
        const userProfile = await this.prisma.user.findUnique({
          where: { clerkId: payload.sub },
          select: { id: true, isActive: true, deactivatedReasonText: true },
        });
        if (userProfile && userProfile.isActive === false) {
          const message =
            userProfile.deactivatedReasonText?.trim() ||
            'Your account has been suspended. Please contact support if you believe this is a mistake.';
          throw new HttpException({ message, code: 'account_suspended' }, 403);
        }
        
        // Fetch user's primary organization (for subscription and organization-based features)
        let primaryOrganizationId: string | null = null;
        if (userProfile?.id) {
          const userOrg = await this.prisma.userOrganization.findFirst({
            where: { userId: userProfile.id },
            orderBy: { createdAt: 'asc' }, // Get the first/oldest organization as primary
          });
          primaryOrganizationId = userOrg?.organizationId || null;
        }
        
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
            profileUserId: userProfile?.id || null,
            organizationId: primaryOrganizationId,
            clerkUserId: payload.sub,
            isPending: true,
          };
          // FIX: Also set request.user for backward compatibility with UsersController
          request.user = {
            clerkId: payload.sub,
            role: 'PENDING',
            id: userProfile?.id || null,
            organizationId: primaryOrganizationId,
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
            profileUserId: userProfile?.id || null,
            organizationId: primaryOrganizationId,
            clerkUserId: payload.sub,
          };
          // FIX: Also set request.user for backward compatibility with UsersController
          request.user = {
            clerkId: payload.sub,
            role: appUser.role,
            id: userProfile?.id || null,
            organizationId: primaryOrganizationId,
          };
          if (this.authDebug) {
            console.log('🔐 Auth Debug: request.context and request.user populated', { context: request.context, user: request.user });
          }
        }
      } catch (e) {
        // Important: do NOT swallow suspension exceptions (or other intentional HttpExceptions).
        // If we do, the request continues without context and may crash later (or bypass some endpoints).
        if (e instanceof HttpException) {
          throw e;
        }
        if (this.authDebug) {
          console.error('🔐 Auth Debug: failed to load AppUser', e);
        }
        // non-fatal; RolesGuard will handle missing context
      }
      return true;
    } catch (error: any) {
      const reason = error?.reason || error?.message || 'unknown';
      const action = error?.action;
       
      console.error('Token verification failed:', { reason, action });
      if (reason === 'jwk-failed-to-resolve' && !this.jwtKey) {
         
        console.error('Clerk JWK fetch failed. Set CLERK_JWT_KEY env with your instance JWT public key to enable offline verification.');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
