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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('staffing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffingController {
  constructor(private readonly staffingService: StaffingService) {}

  @Post('requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRequest(
    @Body() dto: CreateStaffingRequestDto,
    @Request() req: { user: { userId: string; role: UserRole; organizationId?: string } },
  ) {
    return this.staffingService.createRequest(dto, req.user);
  }

  @Get('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getRequest(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role: UserRole; organizationId?: string } },
  ) {
    return this.staffingService.getRequest(id, req.user);
  }

  @Get('requests/:id/matches')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMatches(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; role: UserRole; organizationId?: string } },
  ) {
    return this.staffingService.getMatches(id, req.user);
  }
}
