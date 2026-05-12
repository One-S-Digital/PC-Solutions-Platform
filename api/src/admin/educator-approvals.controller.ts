import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, EducatorApprovalStatus } from '@prisma/client';
import { EducatorApprovalsService } from './educator-approvals.service';

class RejectEducatorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  notes: string;
}

@Controller('admin/educator-approvals')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class EducatorApprovalsController {
  constructor(private readonly educatorApprovalsService: EducatorApprovalsService) {}

  @Get()
  async listEducators(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const validStatuses = Object.values(EducatorApprovalStatus);
    if (status && !validStatuses.includes(status as EducatorApprovalStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }
    return this.educatorApprovalsService.listEducators(
      status as EducatorApprovalStatus | undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('pending-count')
  async getPendingCount() {
    const count = await this.educatorApprovalsService.getPendingCount();
    return { count };
  }

  @Get(':id')
  async getEducator(@Param('id', ParseUUIDPipe) id: string) {
    return this.educatorApprovalsService.getEducatorById(id);
  }

  @Post(':id/approve')
  async approveEducator(@Param('id', ParseUUIDPipe) id: string) {
    return this.educatorApprovalsService.approveEducator(id);
  }

  @Post(':id/reject')
  async rejectEducator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectEducatorDto,
  ) {
    return this.educatorApprovalsService.rejectEducator(id, dto.notes);
  }
}
