import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, ClerkUser } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('CLERK_SECRET_KEY'),
    });
  }

  async validate(payload: any): Promise<ClerkUser> {
    // The payload is already verified by Passport
    // We just need to get the user from our database
    const user = await this.authService.validateClerkToken(
      payload.sub, // Clerk user ID
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}