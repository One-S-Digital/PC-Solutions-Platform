import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { CreateJobListingDto } from './dto/create-job-listing.dto';
import { UpdateJobListingDto } from './dto/update-job-listing.dto';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto/create-job-application.dto';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('recruitment')
@UseGuards(RolesGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // Job Listing endpoints
  @Post('job-listings')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createJobListing(@Body() createJobListingDto: CreateJobListingDto, @Request() req) {
    const foundationId = req.user.organizationId;
    return this.recruitmentService.createJobListing(createJobListingDto, foundationId);
  }

  @Get('job-listings')
  findAllJobListings(
    @Query('foundationId') foundationId?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('contractType') contractType?: string,
    @Query('lang') lang?: string,
    @Request() req?,
  ) {
    const normalizedContractType = contractType ? contractType.toUpperCase() : undefined;
    const isPublicRole = !req?.user || [
      UserRole.EDUCATOR,
      UserRole.PARENT,
      UserRole.SERVICE_PROVIDER,
      UserRole.PRODUCT_SUPPLIER,
    ].includes(req.user.role);
    const publishedOnly = isPublicRole;

    return this.recruitmentService.findAllJobListings({
      foundationId,
      status,
      location,
      search,
      contractType: normalizedContractType,
      publishedOnly,
      lang: lang || 'en',
    });
  }

  @Get('job-listings/:id')
  findJobListingById(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.recruitmentService.findJobListingById(id, lang || 'en');
  }

  @Patch('job-listings/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateJobListing(@Param('id') id: string, @Body() updateJobListingDto: UpdateJobListingDto) {
    return this.recruitmentService.updateJobListing(id, updateJobListingDto);
  }

  @Delete('job-listings/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteJobListing(@Param('id') id: string) {
    return this.recruitmentService.deleteJobListing(id);
  }

  @Get('job-listings/:id/applications')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getJobListingApplications(@Param('id') id: string, @Request() req) {
    const listing = await this.recruitmentService.findJobListingById(id, 'en');

    if (!listing) {
      throw new NotFoundException('Job listing not found');
    }

    if (
      req.user.role === UserRole.FOUNDATION &&
      listing.foundationId !== req.user.organizationId
    ) {
      throw new ForbiddenException('You can only view applications for your own job listings');
    }

    return this.recruitmentService.findJobApplicationsForJob(id);
  }

  // Job Application endpoints
  @Post('applications')
  @Roles(UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createJobApplication(@Body() createJobApplicationDto: CreateJobApplicationDto, @Request() req) {
    const candidateId = req.context.userId;
    return this.recruitmentService.createJobApplication(createJobApplicationDto, candidateId);
  }

  @Get('applications')
  findAllJobApplications(
    @Query('candidateId') candidateId?: string,
    @Query('jobListingId') jobListingId?: string,
    @Query('status') status?: string,
  ) {
    return this.recruitmentService.findAllJobApplications({
      candidateId,
      jobListingId,
      status,
    });
  }

  @Get('applications/my')
  @Roles(UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMyJobApplications(@Request() req) {
    const candidateId = req.context.userId;
    return this.recruitmentService.findJobApplicationsForCandidate(candidateId);
  }

  @Get('applications/job/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getApplicationsForJob(@Param('id') id: string, @Request() req) {
    const listing = await this.recruitmentService.findJobListingById(id, 'en');

    if (!listing) {
      throw new NotFoundException('Job listing not found');
    }

    if (
      req.user.role === UserRole.FOUNDATION &&
      listing.foundationId !== req.user.organizationId
    ) {
      throw new ForbiddenException('You can only view applications for your own job listings');
    }

    return this.recruitmentService.findJobApplicationsForJob(id);
  }

  @Get('applications/:id')
  findJobApplicationById(@Param('id') id: string) {
    return this.recruitmentService.findJobApplicationById(id);
  }

  @Patch('applications/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateJobApplication(@Param('id') id: string, @Body() updateJobApplicationDto: UpdateJobApplicationDto) {
    return this.recruitmentService.updateJobApplication(id, updateJobApplicationDto);
  }

  @Delete('applications/:id')
  @Roles(UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteJobApplication(@Param('id') id: string) {
    return this.recruitmentService.deleteJobApplication(id);
  }

  // Candidate endpoints
  @Get('candidates')
  findAllCandidates(
    @Query('role') role?: string,
    @Query('skills') skills?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
  ) {
    const skillsArray = skills ? skills.split(',') : undefined;
    return this.recruitmentService.findAllCandidates({
      role,
      skills: skillsArray,
      location,
      search,
    });
  }

  @Get('candidates/:id')
  async findCandidateById(@Param('id') id: string) {
    const candidate = await this.recruitmentService.findCandidateById(id);
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  // Matching endpoints
  @Get('job-listings/:id/matching-candidates')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findMatchingCandidates(@Param('id') id: string) {
    return this.recruitmentService.findMatchingCandidates(id);
  }

  // Analytics endpoints
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getRecruitmentStats() {
    return this.recruitmentService.getRecruitmentStats();
  }
}