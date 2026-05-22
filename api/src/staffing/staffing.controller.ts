import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StaffingService } from './staffing.service';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

type RequestContext = { context?: { profileUserId: string; role: UserRole; organizationId?: string } };

@Controller('staffing')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class StaffingController {
  constructor(private readonly staffingService: StaffingService) {}

  @Post('requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRequest(
    @Body() dto: CreateStaffingRequestDto,
    @Request() req: RequestContext,
  ) {
    return this.staffingService.createRequest(dto, {
      userId: req.context!.profileUserId,
      role: req.context!.role,
      organizationId: req.context?.organizationId,
    });
  }

  @Get('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getRequest(
    @Param('id') id: string,
    @Request() req: RequestContext,
  ) {
    return this.staffingService.getRequest(id, {
      userId: req.context!.profileUserId,
      role: req.context!.role,
      organizationId: req.context?.organizationId,
    });
  }

  @Get('requests/:id/matches')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMatches(
    @Param('id') id: string,
    @Request() req: RequestContext,
  ) {
    return this.staffingService.getMatches(id, {
      userId: req.context!.profileUserId,
      role: req.context!.role,
      organizationId: req.context?.organizationId,
    });
  }
}
