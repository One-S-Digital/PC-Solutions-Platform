import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

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
  iss?: string; // Issuer
  aud?: string; // Audience
}

@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);
  private clerkPublicKey: string | null = null;
  private keyCache: Map<string, { key: string; expires: number }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async verifyToken(token: string): Promise<ClerkJwtPayload> {
    try {
      // First decode the token to get the header and payload without verification
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      const { header, payload } = decoded as unknown as { header: any; payload: ClerkJwtPayload };

      // Verify the token signature using Clerk's public key
      const publicKey = await this.getClerkPublicKey(header.kid);
      if (!publicKey) {
        throw new UnauthorizedException('Unable to verify token signature');
      }

      // Verify the token signature
      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.configService.get<string>('CLERK_JWT_ISSUER'),
        audience: this.configService.get<string>('CLERK_JWT_AUDIENCE'),
      }) as ClerkJwtPayload;

      // Additional validation
      this.validateTokenPayload(verifiedPayload);

      return verifiedPayload;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Token verification failed: ${error.message}`);
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async getClerkPublicKey(kid: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.keyCache.get(kid);
      if (cached && cached.expires > Date.now()) {
        return cached.key;
      }

      // Fetch public key from Clerk
      const clerkPublishableKey = this.configService.get<string>('CLERK_PUBLISHABLE_KEY');
      if (!clerkPublishableKey) {
        throw new UnauthorizedException('Clerk publishable key not configured');
      }

      // Extract the instance ID from the publishable key
      // Format: pk_test_<instanceId> or pk_live_<instanceId>
      const keyParts = clerkPublishableKey.split('_');
      const instanceId = keyParts[2]; // Third segment is the instance ID
      const jwksUrl = `https://${instanceId}.clerk.accounts.dev/.well-known/jwks.json`;

      const response = await fetch(jwksUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
      }

      const jwks = await response.json();
      const key = jwks.keys.find((k: any) => k.kid === kid);

      if (!key) {
        throw new Error(`Public key not found for kid: ${kid}`);
      }

      // Convert JWK to PEM format
      const publicKey = this.jwkToPem(key);

      // Cache the key for 1 hour
      this.keyCache.set(kid, {
        key: publicKey,
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return publicKey;
    } catch (error) {
      this.logger.error('Failed to fetch Clerk public key', error);
      return null;
    }
  }

  private jwkToPem(jwk: any): string {
    const { n, e } = jwk;
    
    // Convert base64url to base64
    const nBuffer = Buffer.from(n, 'base64url');
    const eBuffer = Buffer.from(e, 'base64url');

    // Create RSA public key
    const publicKey = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: nBuffer.toString('base64'),
        e: eBuffer.toString('base64'),
      },
      format: 'jwk',
    });

    return publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }

  private validateTokenPayload(payload: ClerkJwtPayload): void {
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token has expired');
    }

    // Check required fields
    if (!payload.sub) {
      throw new UnauthorizedException('Token missing required field: sub');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Token missing required field: email');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      throw new UnauthorizedException('Invalid email format in token');
    }
  }

  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }

  // Fallback method for backward compatibility (uses secret key)
  async verifyTokenWithSecret(token: string): Promise<ClerkJwtPayload> {
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
}