import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProfilesController } from './admin-profiles.controller';
import { AdminSubresourcesController } from './admin-subresources.controller';
import { EducatorApprovalsController } from './educator-approvals.controller';
import { EducatorApprovalsService } from './educator-approvals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RoleManagementModule } from './role-management/role-management.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { UploadModule } from '../upload/upload.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, AuthModule, RoleManagementModule, MarketplaceModule, UploadModule, EmailNotificationModule],
  controllers: [AdminController, AdminProfilesController, AdminSubresourcesController, EducatorApprovalsController],
  providers: [EducatorApprovalsService],
})
export class AdminModule {}