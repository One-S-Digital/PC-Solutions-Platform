import { Module } from '@nestjs/common';
import { RoleManagementController } from './role-management.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleManagementController],
})
export class RoleManagementModule {}