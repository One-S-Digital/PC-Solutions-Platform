import { Module } from '@nestjs/common';
import { ContentManagementController } from './content-management.controller';
import { ContentManagementService } from './content-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [PrismaModule, UploadModule, TranslationModule],
  controllers: [ContentManagementController],
  providers: [ContentManagementService],
  exports: [ContentManagementService],
})
export class ContentManagementModule {}