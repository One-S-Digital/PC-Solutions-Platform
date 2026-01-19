import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RenderDebugController } from './render-debug.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, RenderDebugController],
})
export class HealthModule {}