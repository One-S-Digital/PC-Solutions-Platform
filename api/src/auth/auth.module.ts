import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkStrategy } from './clerk.strategy';
import { RolesGuard } from './roles.guard';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkAuthMiddleware } from './clerk-auth.middleware';
import { ClerkAuthService } from './clerk-auth.service';
import { UserSyncService } from './user-sync.service';
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
  providers: [AuthService, ClerkStrategy, RolesGuard, ClerkAuthGuard, ClerkAuthMiddleware, ClerkAuthService, UserSyncService],
  exports: [AuthService, RolesGuard, ClerkAuthGuard, ClerkAuthMiddleware, ClerkAuthService, UserSyncService],
})
export class AuthModule {}