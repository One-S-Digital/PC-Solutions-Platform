import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, JobStatus, JobContractType, OrganizationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateJobListingDto } from '../recruitment/dto/create-job-listing.dto';

@Controller()
@UseGuards(RolesGuard)
export class CompatController {
  constructor(private prisma: PrismaService) {}

  @Get('products')
  @Public()
  async getProducts() {
    try {
      const products = await this.prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: products, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('services')
  @Public()
  async getServices() {
    try {
      const services = await this.prisma.service.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: services, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('job-listings')
  @Public()
  async getJobListings() {
    try {
      const jobs = await this.prisma.jobListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          foundation: true,
          _count: {
            select: { applications: true },
          },
        },
      });
      
      // Transform to include organization name and applicant count
      const formattedJobs = jobs.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary || job.salaryRange,
        type: job.contractType,
        status: job.status,
        organizationName: job.foundation?.name || 'Unknown Organization',
        foundationId: job.foundationId,
        applicants: job._count.applications,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        qualifications: job.qualifications,
        benefits: job.benefits,
        createdAt: job.createdAt.toISOString(),
      }));
      
      return { success: true, message: 'OK', data: formattedJobs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('job-listings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION)
  async createJobListing(@Body() createJobListingDto: CreateJobListingDto) {
    try {
      const job = await this.prisma.jobListing.create({
        data: {
          title: createJobListingDto.title,
          description: createJobListingDto.description,
          location: createJobListingDto.location,
          salary: createJobListingDto.salary,
          contractType: createJobListingDto.contractType || JobContractType.FULL_TIME,
          foundationId: createJobListingDto.foundationId,
          requirements: createJobListingDto.requirements || [],
          responsibilities: createJobListingDto.responsibilities || [],
          qualifications: createJobListingDto.qualifications || [],
          benefits: createJobListingDto.benefits || [],
          status: createJobListingDto.status || JobStatus.DRAFT,
          publishedAt: createJobListingDto.status === JobStatus.PUBLISHED ? new Date() : null,
        },
        include: {
          foundation: true,
        },
      });
      
      const formattedJob = {
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary,
        type: job.contractType,
        status: job.status,
        organizationName: job.foundation?.name || 'Unknown Organization',
        foundationId: job.foundationId,
        applicants: 0,
        createdAt: job.createdAt.toISOString(),
      };
      
      return { success: true, message: 'Job listing created successfully', data: formattedJob, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create job listing', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('orders')
  @Public()
  async getOrders() {
    try {
      const orders = await this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: orders, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('order-requests')
  @Public()
  async getOrderRequests() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('candidates')
  @Public()
  async getCandidates() {
    try {
      const candidates = await this.prisma.user.findMany({
        where: { role: UserRole.EDUCATOR },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          avatarAsset: true,
        },
      });
      
      // Transform to candidate format
      const formattedCandidates = candidates.map(user => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        email: user.email,
        phone: user.phoneNumber,
        currentRoleOrTitle: 'Educator',
        role: user.role,
        experience: user.workExperience,
        availabilityStatus: user.availability || 'Available',
        skills: user.skills,
        certifications: user.certifications,
        shortBio: user.shortBio,
        createdAt: user.createdAt.toISOString(),
        user: {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          email: user.email,
        },
      }));
      
      return { success: true, message: 'OK', data: formattedCandidates, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('candidates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createCandidate(@Body() createCandidateDto: CreateCandidateDto) {
    try {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createCandidateDto.email },
      });
      if (existingUser) {
        return {
          success: false,
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString(),
        };
      }

      // Generate a temporary clerkId for admin-created candidates
      const tempClerkId = `admin_created_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const candidate = await this.prisma.user.create({
        data: {
          clerkId: tempClerkId,
          email: createCandidateDto.email,
          firstName: createCandidateDto.firstName,
          lastName: createCandidateDto.lastName,
          phoneNumber: createCandidateDto.phoneNumber,
          skills: createCandidateDto.skills || [],
          certifications: createCandidateDto.certifications || [],
          workExperience: createCandidateDto.workExperience,
          education: createCandidateDto.education,
          availability: createCandidateDto.availability,
          shortBio: createCandidateDto.shortBio,
          role: UserRole.EDUCATOR,
        },
      });
      
      const formattedCandidate = {
        id: candidate.id,
        name: [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || candidate.email,
        email: candidate.email,
        phone: candidate.phoneNumber,
        currentRoleOrTitle: 'Educator',
        role: candidate.role,
        experience: candidate.workExperience,
        availabilityStatus: candidate.availability || 'Available',
        skills: candidate.skills,
        certifications: candidate.certifications,
        shortBio: candidate.shortBio,
        createdAt: candidate.createdAt.toISOString(),
      };
      
      return { success: true, message: 'Candidate created successfully', data: formattedCandidate, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create candidate', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('policy-documents')
  @Public()
  async getPolicyDocuments() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-alerts')
  @Public()
  async getPolicyAlerts() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('users')
  @Public()
  async getUsers() {
    try {
      const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: users, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('organizations')
  @Public()
  async getOrganizations() {
    try {
      const orgs = await this.prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: orgs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('parent-leads')
  @Public()
  async getParentLeads() {
    try {
      const leads = await this.prisma.parentLead.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: leads, timestamp: new Date().toISOString() };
    } catch (error) {
      // If table missing, return empty silently to avoid 500 in admin
      return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
    }
  }

  @Get('messages/conversations')
  @Public()
  async getConversations() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }
}

