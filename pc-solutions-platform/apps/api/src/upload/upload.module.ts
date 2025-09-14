import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UploadController],
  providers: [UploadService, CloudflareR2Service],
  exports: [UploadService, CloudflareR2Service],
})
export class UploadModule {}