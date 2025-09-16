import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkAuthMiddleware } from './clerk-auth.middleware';
import { ClerkAuthService } from './clerk-auth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('CLERK_SECRET_KEY'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, ClerkAuthGuard, ClerkAuthMiddleware, ClerkAuthService],
  exports: [AuthService, RolesGuard, ClerkAuthGuard, ClerkAuthMiddleware, ClerkAuthService],
})
export class AuthModule {}