import { Module } from '@nestjs/common';
import { PolicyAlertsController } from './policy-alerts.controller';
import { PolicyAlertsService } from './policy-alerts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyAlertsController],
  providers: [PolicyAlertsService],
  exports: [PolicyAlertsService],
})
export class PolicyAlertsModule {}