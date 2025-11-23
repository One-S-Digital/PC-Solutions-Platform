import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    RolesGuard,
    AuthService,
  ],
  exports: [RolesGuard, AuthService],
})
export class AuthModule {}
