import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthPipelineGuard } from './guards/auth-pipeline.guard';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    ClerkAuthGuard,
    RolesGuard,
    AuthPipelineGuard,
  ],
  exports: [ClerkAuthGuard, RolesGuard, AuthPipelineGuard],
})
export class AuthModule {}