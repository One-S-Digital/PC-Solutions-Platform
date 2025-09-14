import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

export interface ClerkJwtPayload {
  sub: string; // Clerk user ID
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  orgId?: string;
  orgRole?: UserRole;
  iat: number;
  exp: number;
}

@Injectable()
export class ClerkAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async verifyToken(token: string): Promise<ClerkJwtPayload> {
    try {
      const secret = this.configService.get<string>('CLERK_SECRET_KEY');
      if (!secret) {
        throw new UnauthorizedException('Clerk secret key not configured');
      }

      const payload = this.jwtService.verify(token, { secret });
      return payload as ClerkJwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }
}