import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ElearningController } from './elearning.controller';
import { ElearningService } from './elearning.service';

@Module({
  imports: [PrismaModule],
  controllers: [ElearningController],
  providers: [ElearningService],
  exports: [ElearningService],
})
export class ElearningModule {}