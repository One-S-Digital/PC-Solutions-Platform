import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, EducatorApprovalStatus } from '@prisma/client';
import { EducatorApprovalsService } from './educator-approvals.service';

class RejectEducatorDto {
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
    const approvalStatus = status ? (status as EducatorApprovalStatus) : undefined;
    return this.educatorApprovalsService.listEducators(
      approvalStatus,
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
