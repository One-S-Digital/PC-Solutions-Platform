import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClerkAuthService } from './clerk-auth.service';

@Injectable()
export class ClerkAuthMiddleware implements NestMiddleware {
  constructor(private clerkAuthService: ClerkAuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(req);
    
    if (token) {
      try {
        const user = await this.clerkAuthService.validateClerkToken(token);
        (req as any).user = user;
      } catch (error) {
        // Token is invalid, but we don't throw an error in middleware
        // Let the guards handle authentication requirements
      }
    }
    
    next();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}