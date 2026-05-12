import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InternPoolService } from './intern-pool.service';
import { CreateInternPoolRequestDto } from './dto/create-intern-pool-request.dto';
import { ApplyInternPoolDto, ProposeInternDto, RespondInternApplicationDto } from './dto/apply-intern-pool.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('intern-pool')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class InternPoolController {
  constructor(private readonly internPoolService: InternPoolService) {}

  // ── 1. Foundation posts a placement request ───────────────────────────────
  @Post('requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRequest(@Body() dto: CreateInternPoolRequestDto, @Request() req) {
    return this.internPoolService.createRequest(dto, req.user.organizationId, req.user.id);
  }

  // ── 2. List placement requests ────────────────────────────────────────────
  @Get('requests')
  @Roles(UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllRequests(
    @Query('status') status?: string,
    @Query('foundationId') foundationId?: string,
    @Request() req?,
  ) {
    const isAdmin = req?.user?.role === UserRole.ADMIN || req?.user?.role === UserRole.SUPER_ADMIN;
    const isFoundation = req?.user?.role === UserRole.FOUNDATION;
    const resolvedFoundationId = isAdmin ? foundationId : isFoundation ? req?.user?.organizationId : undefined;

    // Foundation user with no linked organization: return nothing
    if (isFoundation && !resolvedFoundationId) {
      return [];
    }

    return this.internPoolService.findAllRequests({
      foundationId: resolvedFoundationId,
      status,
      isAdmin,
      includeApplicants: isAdmin || isFoundation,
    });
  }

  // ── 3. Get single request ─────────────────────────────────────────────────
  @Get('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findRequestById(@Param('id') id: string) {
    return this.internPoolService.findRequestById(id);
  }

  // ── 4. Cancel a request ───────────────────────────────────────────────────
  @Delete('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  cancelRequest(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.internPoolService.cancelRequest(id, req.user.organizationId, isAdmin);
  }

  // ── 5. Intern self-applies ────────────────────────────────────────────────
  @Post('requests/:id/apply')
  @Roles(UserRole.EDUCATOR)
  applyToRequest(@Param('id') requestId: string, @Body() dto: ApplyInternPoolDto, @Request() req) {
    return this.internPoolService.applyToRequest(requestId, req.user.id, dto);
  }

  // ── 6. Foundation responds to an application ──────────────────────────────
  @Patch('applications/:id/respond')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  respondToApplication(
    @Param('id') applicationId: string,
    @Body() dto: RespondInternApplicationDto,
    @Request() req,
  ) {
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.internPoolService.respondToApplication(applicationId, dto, req.user.organizationId, isAdmin);
  }

  // ── 7. Foundation proposes directly to an intern ──────────────────────────
  @Post('requests/:id/propose')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  proposeToIntern(
    @Param('id') requestId: string,
    @Body() dto: ProposeInternDto,
    @Request() req,
  ) {
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.internPoolService.proposeToIntern(requestId, dto.applicantId, req.user.organizationId, isAdmin, dto.note);
  }

  // ── 8. Educator: my applications ─────────────────────────────────────────
  @Get('applications/my')
  @Roles(UserRole.EDUCATOR)
  getMyApplications(@Request() req) {
    return this.internPoolService.getMyApplications(req.user.id);
  }

  // ── 9. Available interns pool (for foundations) ───────────────────────────
  @Get('available-interns')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAvailableInterns(@Query('role') role?: string, @Query('region') region?: string) {
    return this.internPoolService.findAvailableInterns({ role, region });
  }

  // ── 10. Signals / KPI ────────────────────────────────────────────────────
  @Get('signals')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getSignals(@Request() req, @Query('foundationId') foundationId?: string) {
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    const id = isAdmin ? foundationId : req.user.organizationId;
    return this.internPoolService.getSignals(id);
  }

  // ── 11. Toggle intern availability ───────────────────────────────────────
  @Patch('availability')
  @Roles(UserRole.EDUCATOR)
  toggleAvailability(@Body('available') available: boolean, @Request() req) {
    return this.internPoolService.toggleInternAvailability(req.user.id, available);
  }
}
