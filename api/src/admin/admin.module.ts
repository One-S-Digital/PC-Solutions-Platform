import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProfilesController } from './admin-profiles.controller';
import { AdminSubresourcesController } from './admin-subresources.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RoleManagementModule } from './role-management/role-management.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, AuthModule, RoleManagementModule, MarketplaceModule, UploadModule],
  controllers: [AdminController, AdminProfilesController, AdminSubresourcesController],
})
export class AdminModule {}