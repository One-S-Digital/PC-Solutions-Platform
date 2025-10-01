import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudflareR2Service } from './cloudflare-r2.service';
import { R2Service } from './r2.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UploadController],
  providers: [UploadService, CloudflareR2Service, R2Service],
  exports: [UploadService, CloudflareR2Service, R2Service],
})
export class UploadModule {}