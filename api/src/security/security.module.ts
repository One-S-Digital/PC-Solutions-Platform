import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AntivirusUploadController } from './antivirus-upload.controller';
import { HealthController } from './health.controller';
import { ClamAVService } from './clamav.service';
import { MimeValidationService } from './mime-validation.service';
import { QuarantineStorageService } from './quarantine-storage.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [AntivirusUploadController, HealthController],
  providers: [ClamAVService, MimeValidationService, QuarantineStorageService],
  exports: [ClamAVService, MimeValidationService, QuarantineStorageService],
})
export class SecurityModule {}