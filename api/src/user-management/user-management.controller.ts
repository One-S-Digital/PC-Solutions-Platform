import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserManagementService, UserFilters, BulkUserOperation, USER_EXPORT_MAX_ROWS } from './user-management.service';

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
    @Query('isActive') isActive?: string,
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
      isActive: isActive as any,
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

  /**
   * Export users as CSV or XLSX. Pass `userIds` to export a hand-picked
   * selection, otherwise the filters decide which users are included.
   */
  @Post('export')
  async exportUsers(
    @Body()
    body: {
      format?: 'csv' | 'xlsx';
      userIds?: string[];
      filters?: {
        role?: string;
        isActive?: boolean | string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
      };
    },
    @Res() res: Response,
  ) {
    const format = body?.format === 'xlsx' ? 'xlsx' : 'csv';
    // Omitted userIds means "export by filters"; a present value must be a
    // well-formed, non-empty selection so a bad payload never widens the export.
    let userIds: string[] | undefined;
    if (body?.userIds !== undefined) {
      if (
        !Array.isArray(body.userIds) ||
        body.userIds.length === 0 ||
        !body.userIds.every((id: unknown) => typeof id === 'string' && id.length > 0)
      ) {
        throw new BadRequestException('userIds must be a non-empty array of user ids');
      }
      userIds = body.userIds;
    }
    if (userIds && userIds.length > USER_EXPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Cannot export more than ${USER_EXPORT_MAX_ROWS} selected users at once`,
      );
    }
    const f = body?.filters ?? {};

    const result = await this.userManagementService.exportUsers({
      format,
      userIds,
      filters: {
        role: this.parseRole(f.role),
        isActive:
          f.isActive === undefined || f.isActive === ''
            ? undefined
            : f.isActive === true || f.isActive === 'true',
        search: typeof f.search === 'string' && f.search ? f.search : undefined,
        dateFrom: this.parseDate(f.dateFrom, 'dateFrom'),
        dateTo: this.parseDate(f.dateTo, 'dateTo'),
      },
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Export-Count', String(result.count));
    return res.send(result.buffer);
  }

  @Get('export/csv')
  async exportUsersCsv(
    @Query('role') role: string | undefined,
    @Query('isActive') isActive: string | undefined,
    @Query('search') search: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.userManagementService.exportUsers({
      format: 'csv',
      filters: {
        role: this.parseRole(role),
        isActive: isActive === undefined || isActive === '' ? undefined : isActive === 'true',
        search: search || undefined,
        dateFrom: this.parseDate(dateFrom, 'dateFrom'),
        dateTo: this.parseDate(dateTo, 'dateTo'),
      },
    });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(result.buffer);
  }

  private parseDate(value: unknown, field: string): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private parseRole(value: unknown): UserRole | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !(Object.values(UserRole) as string[]).includes(value)) {
      throw new BadRequestException('Invalid role');
    }
    return value as UserRole;
  }
}
