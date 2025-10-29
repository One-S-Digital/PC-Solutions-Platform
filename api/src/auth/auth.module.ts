import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UserSyncService } from './services/user-sync.service';
import { AuthSyncController } from './controllers/auth-sync.controller';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AuthSyncController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    RolesGuard,
    UserSyncService,
  ],
  exports: [RolesGuard, UserSyncService],
})
export class AuthModule {}