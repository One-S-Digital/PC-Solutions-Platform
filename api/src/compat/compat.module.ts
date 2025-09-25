import { Module } from '@nestjs/common';
import { CompatController } from './compat.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompatController],
})
export class CompatModule {}

