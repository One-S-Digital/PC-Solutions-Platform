import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { UserManagementService, UserFilters, BulkUserOperation } from './user-management.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('role') role?: string,
    @Query('accountEnabled') accountEnabled?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('lastActiveFrom') lastActiveFrom?: string,
    @Query('lastActiveTo') lastActiveTo?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const filters: UserFilters = {
      role: role as UserRole,
      accountEnabled: accountEnabled as any,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      lastActiveFrom: lastActiveFrom ? new Date(lastActiveFrom) : undefined,
      lastActiveTo: lastActiveTo ? new Date(lastActiveTo) : undefined,
    };

    return this.userManagementService.getUsers(
      parseInt(page),
      parseInt(limit),
      filters,
      sortBy,
      sortOrder,
    );
  }

  @Get('stats')
  async getUserStats() {
    return this.userManagementService.getUserStats();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userManagementService.getUserById(id);
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.userManagementService.updateUser(id, updateData);
  }

  @Post('bulk')
  async bulkUpdateUsers(@Body() operation: BulkUserOperation) {
    return this.userManagementService.bulkUpdateUsers(operation);
  }

  @Get(':id/activity')
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.userManagementService.getUserActivity(
      id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('notifications')
  async sendEmailNotification(
    @Body() body: { userIds: string[]; subject: string; content: string },
  ) {
    return this.userManagementService.sendEmailNotification(
      body.userIds,
      body.subject,
      body.content,
    );
  }

  @Get('export/csv')
  async exportUsers(
    @Query('role') role?: string,
    @Query('accountEnabled') accountEnabled?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters: UserFilters = {
      role: role as UserRole,
      accountEnabled: accountEnabled as any,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.userManagementService.exportUsers(filters);
  }
}