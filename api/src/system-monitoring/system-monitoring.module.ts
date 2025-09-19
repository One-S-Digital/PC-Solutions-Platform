import { Module } from '@nestjs/common';
import { SystemMonitoringController } from './system-monitoring.controller';
import { SystemMonitoringService } from './system-monitoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemMonitoringController],
  providers: [SystemMonitoringService],
  exports: [SystemMonitoringService],
})
export class SystemMonitoringModule {}