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
import { RecruitmentService } from './recruitment.service';
import { CreateJobListingDto, UpdateJobListingDto } from './dto/create-job-listing.dto';
import { CreateJobApplicationDto, UpdateJobApplicationDto } from './dto/create-job-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  ) {
    return this.recruitmentService.findAllJobListings({
      foundationId,
      status,
      location,
      search,
    });
  }

  @Get('job-listings/:id')
  findJobListingById(@Param('id') id: string) {
    return this.recruitmentService.findJobListingById(id);
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

  // Job Application endpoints
  @Post('applications')
  @Roles(UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createJobApplication(@Body() createJobApplicationDto: CreateJobApplicationDto, @Request() req) {
    const candidateId = req.user.id;
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
  findCandidateById(@Param('id') id: string) {
    return this.recruitmentService.findCandidateById(id);
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