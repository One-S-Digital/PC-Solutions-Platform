import { Module } from '@nestjs/common';
import { RoleManagementController } from './role-management.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SyncModule } from '../../sync/sync.module';

@Module({
  imports: [PrismaModule, SyncModule],
  controllers: [RoleManagementController],
})
export class RoleManagementModule {}