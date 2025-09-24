import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClerkAuthService } from './clerk-auth.service';

@Injectable()
export class ClerkAuthGuard extends AuthGuard('clerk') {
  constructor(private clerkAuthService: ClerkAuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    console.log('🔧 ClerkAuthGuard Debug:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenStart: token?.substring(0, 20) || 'none',
      url: request.url,
      method: request.method
    });
    
    if (!token) {
      console.log('❌ No token provided');
      throw new UnauthorizedException('No token provided');
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