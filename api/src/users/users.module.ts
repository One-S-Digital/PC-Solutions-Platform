import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrincipalModule } from '../principal/principal.module';
import { SyncModule } from '../sync/sync.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [AuthModule, PrismaModule, PrincipalModule, SyncModule, EmailNotificationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}