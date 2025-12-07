import { Module } from '@nestjs/common';
import { OrganizationDocumentsController } from './organization-documents.controller';
import { OrganizationDocumentsService } from './organization-documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrincipalModule } from '../principal/principal.module';

@Module({
  imports: [PrismaModule, AuthModule, PrincipalModule],
  controllers: [OrganizationDocumentsController],
  providers: [OrganizationDocumentsService],
  exports: [OrganizationDocumentsService],
})
export class OrganizationDocumentsModule {}
