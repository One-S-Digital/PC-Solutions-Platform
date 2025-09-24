import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ElearningController } from './elearning.controller';
import { ElearningService } from './elearning.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ElearningController],
  providers: [ElearningService],
  exports: [ElearningService],
})
export class ElearningModule {}