import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { ClerkAuthService } from './clerk-auth.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private clerkAuthService: ClerkAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    console.log('🔧 ClerkAuthGuard Debug:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 20) || 'none',
      url: request.url,
      method: request.method,
      hasService: !!this.clerkAuthService,
      serviceMethods: this.clerkAuthService ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.clerkAuthService)) : 'undefined'
    });
    
    if (!token) {
      console.log('❌ No token provided');
      throw new UnauthorizedException('No token provided');
    }

    // Debug token claims to identify issuer mismatch
    try {
      const [header, payload] = token.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString());
      
      console.log('🔧 Token Claims Debug:', {
        iss: decodedPayload.iss,
        aud: decodedPayload.aud,
        kid: decodedHeader.kid,
        expectedJWKS: `${decodedPayload.iss}/.well-known/jwks.json`
      });
    } catch (e) {
      console.error('❌ Token decode error:', e);
    }

    if (!this.clerkAuthService) {
      console.error('❌ ClerkAuthService not injected');
      throw new UnauthorizedException('Authentication service not available');
    }

    try {
      const user = await this.clerkAuthService.validateClerkToken(token);
      console.log('✅ Token validated successfully:', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      request.user = user;
      return true;
    } catch (error) {
      console.error('❌ Token validation failed:', {
        error: error instanceof Error ? error.message : String(error),
        tokenStart: token.substring(0, 20)
      });
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}