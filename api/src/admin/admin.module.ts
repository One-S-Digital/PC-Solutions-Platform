import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminProfilesController } from './admin-profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RoleManagementModule } from './role-management/role-management.module';

@Module({
  imports: [PrismaModule, AuthModule, RoleManagementModule],
  controllers: [AdminController, AdminProfilesController],
})
export class AdminModule {}