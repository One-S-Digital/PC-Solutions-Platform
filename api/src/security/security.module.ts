import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AntivirusUploadController } from './antivirus-upload.controller';
import { HealthController } from './health.controller';
import { PasswordChangeController } from './password-change.controller';
import { EmailChangeController } from './email-change.controller';
import { ClamAVService } from './clamav.service';
import { MimeValidationService } from './mime-validation.service';
import { QuarantineStorageService } from './quarantine-storage.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, AuthModule, PrismaModule],
  controllers: [AntivirusUploadController, HealthController, PasswordChangeController, EmailChangeController],
  providers: [ClamAVService, MimeValidationService, QuarantineStorageService],
  exports: [ClamAVService, MimeValidationService, QuarantineStorageService],
})
export class SecurityModule {}