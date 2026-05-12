import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InternPoolController } from './intern-pool.controller';
import { InternPoolService } from './intern-pool.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [InternPoolController],
  providers: [InternPoolService],
  exports: [InternPoolService],
})
export class InternPoolModule {}
