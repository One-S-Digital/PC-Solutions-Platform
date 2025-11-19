import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobListingDto } from './dto/create-job-listing.dto';
import { UpdateJobListingDto } from './dto/update-job-listing.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';

@Injectable()
export class RecruitmentService {
  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  // Job Listing Management
  async createJobListing(createJobListingDto: CreateJobListingDto, foundationId?: string, userRole?: string, userId?: string) {
    // Dev/testing bypass: allow ADMIN/SUPER_ADMIN to create listings by specifying foundationId,
    // or if missing, pick (or create) a foundation organization for testing.
    if (!foundationId && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      const anyFoundation = await this.prisma.organization.findFirst({
        where: { type: 'FOUNDATION' as any },
        select: { id: true },
      });
      if (anyFoundation?.id) {
        foundationId = anyFoundation.id;
      } else {
        // Create a minimal foundation for dev/testing and optionally link the current user
        const created = await this.prisma.organization.create({
          data: {
            name: 'Dev Test Foundation',
            type: 'FOUNDATION' as any,
            isActive: true,
          },
          select: { id: true },
        });
        foundationId = created.id;
        if (userId) {
          // Link user to this org for subsequent requests (ignore if already linked)
          try {
            await this.prisma.userOrganization.create({
              data: {
                userId,
                organizationId: created.id,
                role: 'FOUNDATION' as any,
              },
            });
          } catch {
            // ignore
          }
        }
      }
    }

    if (!foundationId) {
      throw new Error('Cannot post job. Foundation details are missing. Provide foundationId or use a foundation user.');
    }

    const jobListing = await this.prisma.jobListing.create({
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

    // Save translatable fields and trigger translation
    const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
    const translationPayload: Record<string, any> = {
      title: jobListing.title,
      description: jobListing.description || '',
      requirements: Array.isArray(jobListing.requirements) 
        ? jobListing.requirements.join('\n') 
        : (jobListing.requirements || ''),
    };
    
    // Only save translations if there's translatable content
    if (translationPayload.title || translationPayload.description || translationPayload.requirements) {
      await this.translationService.saveEntityWithTranslations(
        'job_listing',
        jobListing.id,
        translationPayload,
        translatableFields,
      );
    }

    return jobListing;
  }

  async findAllJobListings(filters?: {
    foundationId?: string;
    status?: string;
    location?: string;
    search?: string;
    lang?: string;
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

    const jobListings = await this.prisma.jobListing.findMany({
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

    // Resolve translations if language is specified
    if (filters?.lang && filters.lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
      const jobListingsWithTranslations = await Promise.all(
        jobListings.map(async (jobListing) => {
          const translatedFields = await this.translationService.resolveEntity(
            'job_listing',
            jobListing.id,
            translatableFields,
            filters.lang!,
          );
          
          // Handle requirements array
          let requirements = jobListing.requirements;
          if (translatedFields.requirements) {
            requirements = Array.isArray(translatedFields.requirements)
              ? translatedFields.requirements
              : translatedFields.requirements.split('\n').filter((r: string) => r.trim());
          }
          
          return {
            ...jobListing,
            title: translatedFields.title || jobListing.title,
            description: translatedFields.description || jobListing.description,
            requirements: requirements || jobListing.requirements,
          };
        }),
      );
      return jobListingsWithTranslations;
    }

    return jobListings;
  }

  async findJobListingById(id: string, lang?: string) {
    const jobListing = await this.prisma.jobListing.findUnique({
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

    if (!jobListing) {
      return null;
    }

    // Resolve translations if language is specified
    if (lang && lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
      const translatedFields = await this.translationService.resolveEntity(
        'job_listing',
        jobListing.id,
        translatableFields,
        lang,
      );
      
      // Handle requirements array
      let requirements = jobListing.requirements;
      if (translatedFields.requirements) {
        requirements = Array.isArray(translatedFields.requirements)
          ? translatedFields.requirements
          : translatedFields.requirements.split('\n').filter((r: string) => r.trim());
      }
      
      return {
        ...jobListing,
        title: translatedFields.title || jobListing.title,
        description: translatedFields.description || jobListing.description,
        requirements: requirements || jobListing.requirements,
      };
    }

    return jobListing;
  }

  async updateJobListing(id: string, updateJobListingDto: UpdateJobListingDto) {
    const jobListing = await this.prisma.jobListing.update({
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

    // Update translations if translatable fields changed
    const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
    const hasTranslatableChanges = 
      updateJobListingDto.title !== undefined || 
      updateJobListingDto.description !== undefined ||
      updateJobListingDto.requirements !== undefined;
    
    if (hasTranslatableChanges) {
      const translationPayload: Record<string, any> = {
        title: jobListing.title,
        description: jobListing.description || '',
        requirements: Array.isArray(jobListing.requirements) 
          ? jobListing.requirements.join('\n') 
          : (jobListing.requirements || ''),
      };
      
      await this.translationService.saveEntityWithTranslations(
        'job_listing',
        jobListing.id,
        translationPayload,
        translatableFields,
      );
    }

    return jobListing;
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
    const jobApplication = await this.prisma.jobApplication.create({
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

    // Save translatable fields and trigger translation
    const translatableFields = FIELDS_BY_ENTITY.job_application || ['cover_letter'];
    const translationPayload: Record<string, any> = {
      cover_letter: jobApplication.coverLetter || '',
    };
    
    // Only save translations if there's translatable content
    if (translationPayload.cover_letter) {
      await this.translationService.saveEntityWithTranslations(
        'job_application',
        jobApplication.id,
        translationPayload,
        translatableFields,
      );
    }

    return jobApplication;
  }

  async findAllJobApplications(filters?: {
    candidateId?: string;
    jobListingId?: string;
    status?: string;
    lang?: string;
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

    const jobApplications = await this.prisma.jobApplication.findMany({
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

    // Resolve translations if language is specified
    if (filters?.lang && filters.lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_application || ['cover_letter'];
      const jobApplicationsWithTranslations = await Promise.all(
        jobApplications.map(async (jobApplication) => {
          const translatedFields = await this.translationService.resolveEntity(
            'job_application',
            jobApplication.id,
            translatableFields,
            filters.lang!,
          );
          
          return {
            ...jobApplication,
            coverLetter: translatedFields.cover_letter || jobApplication.coverLetter,
          };
        }),
      );
      return jobApplicationsWithTranslations;
    }

    return jobApplications;
  }

  async findJobApplicationById(id: string, lang?: string) {
    const jobApplication = await this.prisma.jobApplication.findUnique({
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

    if (!jobApplication) {
      return null;
    }

    // Resolve translations if language is specified
    if (lang && lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_application || ['cover_letter'];
      const translatedFields = await this.translationService.resolveEntity(
        'job_application',
        jobApplication.id,
        translatableFields,
        lang,
      );
      
      return {
        ...jobApplication,
        coverLetter: translatedFields.cover_letter || jobApplication.coverLetter,
      };
    }

    return jobApplication;
  }

  async updateJobApplication(id: string, updateJobApplicationDto: UpdateJobApplicationDto) {
    const jobApplication = await this.prisma.jobApplication.update({
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

    // Update translations if translatable fields changed
    const translatableFields = FIELDS_BY_ENTITY.job_application || ['cover_letter'];
    const hasTranslatableChanges = updateJobApplicationDto.coverLetter !== undefined;
    
    if (hasTranslatableChanges) {
      const translationPayload: Record<string, any> = {
        cover_letter: jobApplication.coverLetter || '',
      };
      
      await this.translationService.saveEntityWithTranslations(
        'job_application',
        jobApplication.id,
        translationPayload,
        translatableFields,
      );
    }

    return jobApplication;
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