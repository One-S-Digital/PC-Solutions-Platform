import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobListingDto } from './dto/create-job-listing.dto';
import { UpdateJobListingDto } from './dto/update-job-listing.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  // Job Listing Management
  async createJobListing(createJobListingDto: CreateJobListingDto, foundationId: string) {
    return this.prisma.jobListing.create({
      data: {
        ...createJobListingDto,
        foundationId,
      },
      include: {
        foundation: true,
        applications: {
          include: {
            candidate: true,
          },
        },
      },
    });
  }

  async findAllJobListings(filters?: {
    foundationId?: string;
    status?: string;
    location?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.foundationId) {
      where.foundationId = filters.foundationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { requirements: { has: filters.search } },
      ];
    }

    return this.prisma.jobListing.findMany({
      where,
      include: {
        foundation: true,
        applications: {
          include: {
            candidate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobListingById(id: string) {
    return this.prisma.jobListing.findUnique({
      where: { id },
      include: {
        foundation: true,
        applications: {
          include: {
            candidate: true,
          },
        },
      },
    });
  }

  async updateJobListing(id: string, updateJobListingDto: UpdateJobListingDto) {
    return this.prisma.jobListing.update({
      where: { id },
      data: updateJobListingDto,
      include: {
        foundation: true,
        applications: {
          include: {
            candidate: true,
          },
        },
      },
    });
  }

  async deleteJobListing(id: string) {
    return this.prisma.jobListing.delete({
      where: { id },
    });
  }

  // Job Application Management
  async createJobApplication(
    createJobApplicationDto: CreateJobApplicationDto,
    candidateId: string,
  ) {
    return this.prisma.jobApplication.create({
      data: {
        ...createJobApplicationDto,
        candidateId,
      },
      include: {
        jobListing: {
          include: {
            foundation: true,
          },
        },
        candidate: true,
      },
    });
  }

  async findAllJobApplications(filters?: {
    candidateId?: string;
    jobListingId?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.candidateId) {
      where.candidateId = filters.candidateId;
    }

    if (filters?.jobListingId) {
      where.jobListingId = filters.jobListingId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.jobApplication.findMany({
      where,
      include: {
        jobListing: {
          include: {
            foundation: true,
          },
        },
        candidate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobApplicationById(id: string) {
    return this.prisma.jobApplication.findUnique({
      where: { id },
      include: {
        jobListing: {
          include: {
            foundation: true,
          },
        },
        candidate: true,
      },
    });
  }

  async updateJobApplication(id: string, updateJobApplicationDto: UpdateJobApplicationDto) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: updateJobApplicationDto,
      include: {
        jobListing: {
          include: {
            foundation: true,
          },
        },
        candidate: true,
      },
    });
  }

  async deleteJobApplication(id: string) {
    return this.prisma.jobApplication.delete({
      where: { id },
    });
  }

  // Candidate Management
  async findAllCandidates(filters?: {
    role?: string;
    skills?: string[];
    location?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.skills && filters.skills.length > 0) {
      where.skills = { hasSome: filters.skills };
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { skills: { has: filters.search } },
        { certifications: { has: filters.search } },
      ];
    }

    return this.prisma.user.findMany({
      where: {
        ...where,
        role: 'EDUCATOR',
      },
      include: {
        applications: {
          include: {
            jobListing: {
              include: {
                foundation: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCandidateById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            jobListing: {
              include: {
                foundation: true,
              },
            },
          },
        },
      },
    });
  }

  // Matching Algorithm
  async findMatchingCandidates(jobListingId: string) {
    const jobListing = await this.prisma.jobListing.findUnique({
      where: { id: jobListingId },
      include: {
        foundation: true,
      },
    });

    if (!jobListing) {
      throw new Error('Job listing not found');
    }

    // Simple matching algorithm based on skills and location
    const candidates = await this.prisma.user.findMany({
      where: {
        role: 'EDUCATOR',
        // Add more sophisticated matching logic here
        // For now, we'll return all educators
      },
      include: {
        applications: {
          where: {
            jobListingId,
          },
        },
      },
    });

    // Filter out candidates who already applied
    return candidates.filter(candidate => candidate.applications.length === 0);
  }

  // Analytics
  async getRecruitmentStats() {
    const [
      totalJobListings,
      totalApplications,
      activeJobListings,
      pendingApplications,
      acceptedApplications,
    ] = await Promise.all([
      this.prisma.jobListing.count(),
      this.prisma.jobApplication.count(),
      this.prisma.jobListing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.jobApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.jobApplication.count({ where: { status: 'ACCEPTED' } }),
    ]);

    return {
      totalJobListings,
      totalApplications,
      activeJobListings,
      pendingApplications,
      acceptedApplications,
    };
  }
}