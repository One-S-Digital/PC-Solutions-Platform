import {
  BadRequestException,
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
import { ReplacementsService } from './replacements.service';
import { CreateReplacementRequestDto } from './dto/create-replacement-request.dto';
import { UpdateReplacementRequestDto } from './dto/update-replacement-request.dto';
import { RespondMatchDto } from './dto/respond-match.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('replacements')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ReplacementsController {
  constructor(private readonly replacementsService: ReplacementsService) {}

  // ── 1. Create a replacement request (Foundation) ──────────────────────────
  @Post('requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRequest(@Body() dto: CreateReplacementRequestDto, @Request() req) {
    const foundationId: string | undefined = req.user.organizationId;
    if (!foundationId) {
      throw new BadRequestException('A foundationId is required. Admins must be linked to an organization to create replacement requests.');
    }
    return this.replacementsService.createRequest(dto, foundationId, req.user.id);
  }

  // ── 2. List requests ──────────────────────────────────────────────────────
  @Get('requests')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllRequests(
    @Query('status') status?: string,
    @Query('foundationId') foundationId?: string,
    @Request() req?,
  ) {
    const viewerRole = req?.user?.role;
    const isAdmin =
      viewerRole === UserRole.ADMIN || viewerRole === UserRole.SUPER_ADMIN;
    const resolvedFoundationId =
      isAdmin ? foundationId : req?.user?.organizationId;

    // Foundation user with no linked organization: return nothing
    if (!isAdmin && !resolvedFoundationId) {
      return [];
    }

    return this.replacementsService.findAllRequests({
      foundationId: resolvedFoundationId,
      status,
      isAdmin,
    });
  }

  // ── 3. Get single request ─────────────────────────────────────────────────
  @Get('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDUCATOR)
  findRequestById(@Param('id') id: string, @Request() req) {
    return this.replacementsService.findRequestById(id, { callerId: req.user.id, callerRole: req.user.role });
  }

  // ── 4. Update request status / details ───────────────────────────────────
  @Patch('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateRequest(@Param('id') id: string, @Body() dto: UpdateReplacementRequestDto, @Request() req) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.replacementsService.updateRequest(id, dto, req.user.organizationId, isAdmin);
  }

  // ── 5. Cancel a request ───────────────────────────────────────────────────
  @Delete('requests/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  cancelRequest(@Param('id') id: string, @Request() req) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.replacementsService.cancelRequest(id, req.user.organizationId, isAdmin);
  }

  // ── 6. Propose a match (admin or system) ─────────────────────────────────
  @Post('requests/:id/matches')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  proposeMatch(@Param('id') requestId: string, @Body('educatorId') educatorId: string, @Request() req) {
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.replacementsService.proposeMatch(requestId, educatorId, req.user.organizationId, isAdmin);
  }

  // ── 7. Educator responds to a proposed match ──────────────────────────────
  @Patch('matches/:id/respond')
  @Roles(UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  respondToMatch(@Param('id') matchId: string, @Body() dto: RespondMatchDto, @Request() req) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    return this.replacementsService.respondToMatch(matchId, dto, req.user.id, isAdmin);
  }

  // ── 8. Educator: view my proposed matches ─────────────────────────────────
  @Get('matches/my')
  @Roles(UserRole.EDUCATOR)
  getMyMatches(@Request() req) {
    return this.replacementsService.getMyMatches(req.user.id);
  }

  // ── Staffing signals (used by dashboards) ────────────────────────────────
  @Get('signals')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStaffingSignals(@Request() req, @Query('foundationId') foundationId?: string) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    const id = isAdmin ? foundationId : req.user.organizationId;
    return this.replacementsService.getStaffingSignals(id);
  }

  // ── KPI metrics (time-to-hire, fulfillment speed) ─────────────────────────
  @Get('kpi')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getKpiMetrics(@Request() req, @Query('foundationId') foundationId?: string) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
    const id = isAdmin ? foundationId : req.user.organizationId;
    return this.replacementsService.getKpiMetrics(id);
  }

  // ── Educator availability toggle ──────────────────────────────────────────
  @Patch('availability')
  @Roles(UserRole.EDUCATOR)
  toggleAvailability(@Body('available') available: boolean, @Request() req) {
    return this.replacementsService.toggleReplacementAvailability(req.user.id, available);
  }

  // ── Available educators pool ──────────────────────────────────────────────
  @Get('available-educators')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAvailableEducators(@Query('role') role?: string, @Query('region') region?: string) {
    return this.replacementsService.findAvailableEducators({ role, region });
  }
}
