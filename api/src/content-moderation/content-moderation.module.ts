import { Module } from '@nestjs/common';
import { ContentModerationController } from './content-moderation.controller';
import { ContentModerationService } from './content-moderation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
import { AuthModule } from '../auth/auth.module';
  controllers: [ContentModerationController],
  providers: [ContentModerationService],
  exports: [ContentModerationService],
})
export class ContentModerationModule {}