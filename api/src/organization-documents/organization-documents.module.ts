import { Module } from '@nestjs/common';
import { OrganizationDocumentsController } from './organization-documents.controller';
import { OrganizationDocumentsService } from './organization-documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrincipalModule } from '../principal/principal.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, AuthModule, PrincipalModule, UploadModule],
  controllers: [OrganizationDocumentsController],
  providers: [OrganizationDocumentsService],
  exports: [OrganizationDocumentsService],
})
export class OrganizationDocumentsModule {}
