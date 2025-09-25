import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@repo/types';
import { UserSyncService } from './user-sync.service';
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
  publicMetadata?: {
    role?: UserRole;
    [key: string]: any;
  };
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
    private readonly userSyncService: UserSyncService,
  ) {}

  async verifyToken(token: string): Promise<ClerkJwtPayload> {
    try {
      console.log('🔧 Starting token verification...');
      
      // First decode the token to get the header and payload without verification
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      const { header, payload } = decoded as unknown as { header: any; payload: ClerkJwtPayload };
      console.log('🔧 Token decoded successfully:', {
        kid: header.kid,
        iss: payload.iss,
        sub: payload.sub,
        exp: payload.exp
      });

      // Verify the token signature using Clerk's public key
      console.log('🔧 Getting public key...');
      const publicKey = await this.getClerkPublicKey(header.kid, payload.iss);
      if (!publicKey) {
        throw new UnauthorizedException('Unable to verify token signature');
      }
      console.log('✅ Public key obtained');

      // Verify the token signature
      console.log('🔧 Verifying token signature...');
      const verifiedPayload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: payload.iss,  // Use token's issuer
        audience: payload.aud, // Use token's audience
      }) as ClerkJwtPayload;
      console.log('✅ Token signature verified');

      // Additional validation
      console.log('🔧 Validating token payload...');
      this.validateTokenPayload(verifiedPayload);
      console.log('✅ Token payload validated');

      return verifiedPayload;
    } catch (error) {
      const trace = error instanceof Error ? error.stack : undefined;
      this.logger.error('Token verification failed', trace);
      console.error('❌ verifyToken error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Token verification failed: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new UnauthorizedException(`Invalid token: ${error.message}`);
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private   async getClerkPublicKey(kid: string, issuer?: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.keyCache.get(kid);
      if (cached && cached.expires > Date.now()) {
        return cached.key;
      }

      // Use the issuer from the token if provided, otherwise fall back to publishable key extraction
      let jwksUrl = '';
      
      if (issuer) {
        // Use the exact issuer from the token
        jwksUrl = `${issuer}/.well-known/jwks.json`;
        console.log('🔧 Using token issuer for JWKS:', jwksUrl);
      } else {
        // Fallback to publishable key extraction
        const clerkPublishableKey = this.configService.get<string>('CLERK_PUBLISHABLE_KEY');
        if (!clerkPublishableKey) {
          throw new UnauthorizedException('Clerk publishable key not configured');
        }

        // Extract the instance ID from the publishable key
        // Format: pk_test_<instanceId> or pk_live_<instanceId>
        const keyParts = clerkPublishableKey.split('_');
        const instanceId = keyParts[2]; // Third segment is the instance ID
        
        // Try both possible JWKS URLs
        const possibleUrls = [
          `https://${instanceId}.clerk.accounts.dev/.well-known/jwks.json`,
          `https://clerk.${instanceId}.lcl.dev/.well-known/jwks.json`, // For custom domains
        ];

        for (const url of possibleUrls) {
          console.log('🔧 Trying JWKS URL:', url);
          try {
            const response = await fetch(url);
            if (response.ok) {
              jwksUrl = url;
              console.log('✅ JWKS fetch successful:', url);
              break;
            } else {
              console.log('❌ JWKS fetch failed:', url, response.status, response.statusText);
            }
          } catch (e) {
            console.log('❌ JWKS fetch error:', url, e);
          }
        }

        if (!jwksUrl) {
          throw new Error('Failed to fetch JWKS from any URL');
        }
      }

      // Fetch the JWKS
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
      const trace = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to fetch Clerk public key', trace);
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

    // Email is optional in JWT - we'll get it from Clerk's user data if needed
    // if (!payload.email) {
    //   throw new UnauthorizedException('Token missing required field: email');
    // }

    // Validate email format if present
    if (payload.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        throw new UnauthorizedException('Invalid email format in token');
      }
    }
  }

  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }

  /**
   * Centralized method to derive user role from Clerk payload
   * Returns null if no valid role can be determined
   */
  private deriveRoleFromClerkPayload(payload: ClerkJwtPayload): UserRole | null {
    // Priority order for role sources:
    // 1. publicMetadata.role
    // 2. role claim in JWT
    // 3. orgRole (if applicable)
    
    // Check publicMetadata first (most authoritative)
    if (payload.publicMetadata?.role) {
      const metadataRole = payload.publicMetadata.role;
      if (this.isValidUserRole(metadataRole)) {
        console.log('🔍 Role found in publicMetadata:', metadataRole);
        return metadataRole;
      } else {
        console.warn('⚠️ Invalid role in publicMetadata:', metadataRole);
      }
    }
    
    // Check direct role claim
    if (payload.role) {
      if (this.isValidUserRole(payload.role)) {
        console.log('🔍 Role found in JWT claims:', payload.role);
        return payload.role;
      } else {
        console.warn('⚠️ Invalid role in JWT claims:', payload.role);
      }
    }
    
    // Check organization role (if applicable)
    if (payload.orgRole) {
      if (this.isValidUserRole(payload.orgRole)) {
        console.log('🔍 Role found in orgRole:', payload.orgRole);
        return payload.orgRole;
      } else {
        console.warn('⚠️ Invalid orgRole:', payload.orgRole);
      }
    }
    
    // No valid role found - DO NOT default to PARENT
    console.warn('⚠️ No valid role found in Clerk payload');
    return null;
  }

  /**
   * Validate if a value is a valid UserRole
   */
  private isValidUserRole(role: any): role is UserRole {
    return Object.values(UserRole).includes(role);
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

  // Method expected by the guards and middleware
  async validateClerkToken(token: string): Promise<any> {
    try {
      const payload = await this.verifyToken(token);
      
      try {
        // Fetch user from database to get the role
        const user = await this.userSyncService.findUserByClerkId(payload.sub);
        
        if (!user) {
          console.log('🔧 User not found in database, syncing from Clerk...');
          
          try {
            // Try to sync user from Clerk
            const syncedUser = await this.userSyncService.syncUserFromClerk(payload);
            console.log('✅ User synced:', {
              userId: syncedUser.id,
              email: syncedUser.email,
              role: syncedUser.role
            });
            
            return {
              id: syncedUser.clerkId,
              email: syncedUser.email,
              firstName: syncedUser.firstName,
              lastName: syncedUser.lastName,
              role: syncedUser.role,
              organizationId: payload.orgId,
              createdAt: syncedUser.createdAt,
              updatedAt: syncedUser.updatedAt,
            };
          } catch (syncError) {
            // If sync fails due to no role, try to derive role from payload
            console.error('❌ User sync failed:', syncError);
            
            const derivedRole = this.deriveRoleFromClerkPayload(payload);
            if (!derivedRole) {
              throw new UnauthorizedException('No role assigned. Please contact an administrator.');
            }
            
            // Return temporary user object with derived role
            // The user will be created on next successful sync
            console.warn('⚠️ Returning temporary user with derived role:', derivedRole);
            return {
              id: payload.sub,
              email: payload.email || 'unknown@email.com',
              firstName: payload.firstName || 'Unknown',
              lastName: payload.lastName || 'User',
              role: derivedRole,
              organizationId: payload.orgId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
        }
        
        console.log('✅ User found in database:', {
          userId: user.id,
          email: user.email,
          role: user.role
        });
        
        return {
          id: user.clerkId,
          email: user.email || payload.email,
          firstName: user.firstName || payload.firstName,
          lastName: user.lastName || payload.lastName,
          role: user.role, // Use role from database
          organizationId: payload.orgId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      } catch (dbError) {
        // Handle database errors gracefully
        if (dbError instanceof Error && dbError.message.includes('does not exist in the current database')) {
          console.error('⚠️ Database not initialized. Attempting to derive role from Clerk metadata.');
          console.error('Run migrations: npx prisma migrate deploy');
          
          // Derive role from Clerk metadata - DO NOT default to PARENT
          const derivedRole = this.deriveRoleFromClerkPayload(payload);
          
          if (!derivedRole) {
            console.error('❌ No valid role found in Clerk metadata. Access denied.');
            throw new UnauthorizedException('No role assigned. Please contact an administrator.');
          }
          
          console.log('✅ Using role from Clerk metadata:', derivedRole);
          
          // Return user data from token with role from metadata
          return {
            id: payload.sub,
            email: payload.email || 'unknown@email.com',
            firstName: payload.firstName || 'Unknown',
            lastName: payload.lastName || 'User',
            role: derivedRole,
            organizationId: payload.orgId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        
        // Re-throw other database errors
        throw dbError;
      }
    } catch (error) {
      console.error('❌ validateClerkToken error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new UnauthorizedException(`Invalid token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}