import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ClerkAuthService } from './clerk-auth.service';
import { AuthService, ClerkUser } from './auth.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    private readonly clerkAuthService: ClerkAuthService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          // Use the secure ClerkAuthService to verify the token
          const verifiedPayload = await this.clerkAuthService.verifyToken(rawJwtToken);
          
          // Get user from database using the verified Clerk user ID
          const user = await this.authService.getUserByClerkId(verifiedPayload.sub);
          
          if (!user) {
            return done(new UnauthorizedException('User not found'), false);
          }

          // Return the verified user
          return done(null, user);
        } catch (error) {
          return done(new UnauthorizedException('Token validation failed'), false);
        }
      }
    });
  }

  async validate(payload: any): Promise<ClerkUser> {
    // The payload is already verified by the secretOrKeyProvider
    // We just need to return the user
    return payload;
  }
}