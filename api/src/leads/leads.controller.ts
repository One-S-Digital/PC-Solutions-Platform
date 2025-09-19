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
import { LeadsService } from './leads.service';
import { CreateParentLeadDto, UpdateParentLeadDto } from './dto/create-parent-lead.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('leads')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Parent Lead Management
  @Post('parent-leads')
  @Roles(UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createParentLead(@Body() createParentLeadDto: CreateParentLeadDto) {
    return this.leadsService.createParentLead(createParentLeadDto);
  }

  @Get('parent-leads')
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
  findParentLeadById(@Param('id') id: string) {
    return this.leadsService.findParentLeadById(id);
  }

  @Patch('parent-leads/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateParentLead(@Param('id') id: string, @Body() updateParentLeadDto: UpdateParentLeadDto) {
    return this.leadsService.updateParentLead(id, updateParentLeadDto);
  }

  @Delete('parent-leads/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteParentLead(@Param('id') id: string) {
    return this.leadsService.deleteParentLead(id);
  }

  // Matching and Assignment
  @Get('parent-leads/:id/matching-foundations')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findMatchingFoundations(@Param('id') id: string) {
    return this.leadsService.findMatchingFoundations(id);
  }

  @Post('parent-leads/:id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignLeadToFoundation(
    @Param('id') leadId: string,
    @Body('foundationId') foundationId: string,
  ) {
    return this.leadsService.assignLeadToFoundation(leadId, foundationId);
  }

  @Patch('parent-leads/:id/status')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateLeadStatus(@Param('id') leadId: string, @Body('status') status: string) {
    return this.leadsService.updateLeadStatus(leadId, status);
  }

  // Lead Generation (External API)
  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  generateLeadFromExternalSource(@Body() leadData: any) {
    return this.leadsService.generateLeadFromExternalSource(leadData);
  }

  // Automated Distribution
  @Post('distribute')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  distributeLeadsToFoundations() {
    return this.leadsService.distributeLeadsToFoundations();
  }

  // Notifications
  @Post('notify-foundation')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  notifyFoundationOfNewLead(
    @Body('foundationId') foundationId: string,
    @Body('leadId') leadId: string,
  ) {
    return this.leadsService.notifyFoundationOfNewLead(foundationId, leadId);
  }

  // Analytics
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getLeadsStats() {
    return this.leadsService.getLeadsStats();
  }
}