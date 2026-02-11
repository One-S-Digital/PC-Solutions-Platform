import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { LeadsSchedulerService } from './leads-scheduler.service';
import { CreateParentLeadDto, UpdateParentLeadDto } from './dto/create-parent-lead.dto';
import { CreateLeadResponseDto } from './dto/lead-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { wrapResponse, wrapErrorResponse } from '../common/utils/response.util';

@ApiTags('leads')
@Controller('leads')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadsSchedulerService: LeadsSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get user's organization IDs
   */
  private async getUserOrganizationIds(userId: string): Promise<string[]> {
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return userOrganizations.map((uo) => uo.organizationId);
  }

  // ============================================
  // PARENT LEAD MANAGEMENT (EXISTING)
  // ============================================

  @Post('parent-leads')
  @Public()
  @ApiOperation({ summary: 'Create a new parent lead' })
  createParentLead(@Body() createParentLeadDto: CreateParentLeadDto) {
    return this.leadsService.createParentLead(createParentLeadDto);
  }

  @Get('parent-leads')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all parent leads with optional filters' })
  findAllParentLeads(
    @Query('foundationId') foundationId?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('childAge') childAge?: string,
    @Query('search') search?: string,
  ) {
    return this.leadsService.findAllParentLeads({
      foundationId,
      status,
      location,
      childAge: childAge ? parseInt(childAge, 10) : undefined,
      search,
    });
  }

  @Get('parent-leads/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a parent lead by ID' })
  findParentLeadById(@Param('id') id: string) {
    return this.leadsService.findParentLeadById(id);
  }

  @Patch('parent-leads/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a parent lead' })
  updateParentLead(@Param('id') id: string, @Body() updateParentLeadDto: UpdateParentLeadDto) {
    return this.leadsService.updateParentLead(id, updateParentLeadDto);
  }

  @Delete('parent-leads/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a parent lead' })
  deleteParentLead(@Param('id') id: string) {
    return this.leadsService.deleteParentLead(id);
  }

  // ============================================
  // PARENT-SPECIFIC ENDPOINTS
  // ============================================

  @Get('parent/my-leads')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get leads for the current parent user' })
  @ApiResponse({ status: 200, description: 'Parent leads retrieved successfully' })
  async getMyParentLeads(@Request() req) {
    const profileUserId = req.context?.profileUserId as string | undefined;
    const clerkUserId = (req.context?.clerkUserId || req.context?.userId) as string | undefined;

    // Resolve the profile user reliably (request.context.userId is Clerk ID, not users.id).
    const user = profileUserId
      ? await this.prisma.user.findUnique({
          where: { id: profileUserId },
          select: { id: true, email: true },
        })
      : clerkUserId
        ? await this.prisma.user.findUnique({
            where: { clerkId: clerkUserId },
            select: { id: true, email: true },
          })
        : null;

    if (!user) {
      return wrapErrorResponse('User not found');
    }

    const leadWhere: any = {
      OR: [{ parentUserId: user.id }],
    };

    if (user.email) {
      leadWhere.OR.push({
        parentEmail: {
          equals: user.email,
          mode: 'insensitive' as const,
        },
      });
    }

    // Include both explicit account-linked leads and email-matched historical leads.
    const leads = await this.prisma.parentLead.findMany({
      where: leadWhere,
      include: {
        foundationResponses: {
          include: {
            foundation: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include foundation names
    const transformedLeads = leads.map((lead) => ({
      id: lead.id,
      parentName: lead.parentName,
      parentEmail: lead.parentEmail,
      parentPhone: lead.parentPhone,
      childName: lead.childName,
      childAge: lead.childAge,
      message: lead.message,
      preferredLocation: lead.preferredLocation,
      preferredLanguages: lead.preferredLanguages,
      specialRequirements: lead.specialRequirements,
      status: lead.status,
      parentUserId: lead.parentUserId,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      foundationResponses: lead.foundationResponses.map((r) => ({
        id: r.id,
        foundationId: r.foundationId,
        foundationName: r.foundation.name,
        status: r.status,
        message: r.message,
        respondedAt: r.respondedAt?.toISOString() ?? null,
      })),
    }));

    return wrapResponse(transformedLeads);
  }

  // ============================================
  // MATCHING AND ASSIGNMENT
  // ============================================

  @Get('parent-leads/:id/matching-foundations')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find foundations matching a lead' })
  findMatchingFoundations(@Param('id') id: string) {
    return this.leadsService.findMatchingFoundations(id);
  }

  @Post('parent-leads/:id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a lead to a foundation' })
  assignLeadToFoundation(
    @Param('id') leadId: string,
    @Body('foundationId') foundationId: string,
  ) {
    return this.leadsService.assignLeadToFoundation(leadId, foundationId);
  }

  @Patch('parent-leads/:id/status')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update lead status' })
  updateLeadStatus(@Param('id') leadId: string, @Body('status') status: string) {
    return this.leadsService.updateLeadStatus(leadId, status);
  }

  // ============================================
  // LEAD GENERATION
  // ============================================

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate a lead from external source' })
  generateLeadFromExternalSource(@Body() leadData: any) {
    return this.leadsService.generateLeadFromExternalSource(leadData);
  }

  @Post('distribute')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Distribute leads to matching foundations' })
  distributeLeadsToFoundations() {
    return this.leadsService.distributeLeadsToFoundations();
  }

  @Post('trigger-distribution')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually trigger automated lead distribution' })
  @ApiResponse({ status: 200, description: 'Lead distribution triggered successfully' })
  async triggerLeadDistribution() {
    const result = await this.leadsSchedulerService.triggerLeadDistribution();
    return wrapResponse(result, 'Lead distribution triggered successfully');
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  @Post('notify-foundation')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Notify a foundation of a new lead' })
  notifyFoundationOfNewLead(
    @Body('foundationId') foundationId: string,
    @Body('leadId') leadId: string,
  ) {
    return this.leadsService.notifyFoundationOfNewLead(foundationId, leadId);
  }

  // ============================================
  // ADMIN ANALYTICS
  // ============================================

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get leads statistics' })
  getLeadsStats() {
    return this.leadsService.getLeadsStats();
  }

  // ============================================
  // FOUNDATION-SPECIFIC ENDPOINTS
  // ============================================

  @Get('foundation/my-leads')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get leads for the current foundation' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async getMyFoundationLeads(
    @Request() req,
    @Query('status') status?: string,
    @Query('responseStatus') responseStatus?: string,
    @Query('search') search?: string,
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return wrapErrorResponse('No organization found for user');
    }

    // Aggregate leads from all user organizations
    const allLeads = await Promise.all(
      organizationIds.map((orgId) =>
        this.leadsService.getFoundationLeads(orgId, {
          status,
          responseStatus,
          search,
        }),
      ),
    );

    // Deduplicate leads by id
    const leadsMap = new Map();
    for (const orgLeads of allLeads) {
      for (const lead of orgLeads) {
        if (!leadsMap.has(lead.id)) {
          leadsMap.set(lead.id, lead);
        }
      }
    }

    return wrapResponse(Array.from(leadsMap.values()));
  }

  @Get('foundation/leads/:id')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get a specific lead with foundation response' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  async getFoundationLead(@Request() req, @Param('id') leadId: string) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return wrapErrorResponse('No organization found for user');
    }

    const lead = await this.leadsService.getLeadWithResponses(leadId, organizationIds[0]);
    return wrapResponse(lead);
  }

  @Post('foundation/leads/:id/respond')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Respond to a lead as a foundation' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  async respondToLead(
    @Request() req,
    @Param('id') leadId: string,
    @Body() responseDto: CreateLeadResponseDto,
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return wrapErrorResponse('No organization found for user');
    }

    const result = await this.leadsService.respondToLead(
      leadId,
      organizationIds[0],
      responseDto.status,
      responseDto.message,
    );

    return wrapResponse(result, 'Response recorded successfully');
  }

  @Get('foundation/stats')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get lead response statistics for the foundation' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getFoundationLeadStats(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return wrapResponse({
        totalResponses: 0,
        interested: 0,
        notInterested: 0,
        needsMoreInfo: 0,
        enrolled: 0,
      });
    }

    const stats = await this.leadsService.getFoundationResponseStats(organizationIds[0]);
    return wrapResponse(stats);
  }
}
