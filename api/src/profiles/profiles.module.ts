import { Module } from '@nestjs/common';
import { ProfileController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}