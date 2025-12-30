import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobListingDto } from './dto/create-job-listing.dto';
import { UpdateJobListingDto } from './dto/update-job-listing.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/update-job-application.dto';
import { JobContractType, JobStatus } from '@workspace/types';
import { JobEmploymentType, Prisma } from '@prisma/client';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';

@Injectable()
export class RecruitmentService {
  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  // Job Listing Management
  async createJobListing(createJobListingDto: CreateJobListingDto, foundationId: string) {
    const {
      requirements,
      responsibilities,
      qualifications,
      benefits,
      status,
      contractType,
      employmentType,
      workSchedule,
      startDate,
      ...rest
    } = createJobListingDto;

    const effectiveContractType = contractType ?? JobContractType.FULL_TIME;
    const resolvedEmploymentType =
      employmentType ??
      (effectiveContractType === JobContractType.PART_TIME
        ? JobEmploymentType.PART_TIME
        : effectiveContractType === JobContractType.REPLACEMENT
          ? JobEmploymentType.REPLACEMENT
          : JobEmploymentType.FULL_TIME);

    // Prisma Json fields must receive plain JSON values (not class instances).
    const workScheduleJson: Prisma.InputJsonValue | undefined = workSchedule
      ? (JSON.parse(JSON.stringify(workSchedule)) as Prisma.InputJsonValue)
      : undefined;

    const parsedStartDate =
      startDate && startDate.trim()
        ? (() => {
            const date = new Date(startDate);
            return Number.isNaN(date.getTime()) ? undefined : date;
          })()
        : undefined;

    const jobListing = await this.prisma.jobListing.create({
      data: {
        ...rest,
        contractType: effectiveContractType,
        employmentType: resolvedEmploymentType,
        workSchedule: workScheduleJson,
        startDate: parsedStartDate,
        requirements: requirements ?? [],
        responsibilities: responsibilities ?? [],
        qualifications: qualifications ?? [],
        benefits: benefits ?? [],
        status: status ?? JobStatus.DRAFT,
        publishedAt: status === JobStatus.PUBLISHED ? new Date() : null,
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
        ? JSON.stringify(jobListing.requirements) 
        : '[]',
      responsibilities: Array.isArray(jobListing.responsibilities) 
        ? JSON.stringify(jobListing.responsibilities) 
        : '[]',
      qualifications: Array.isArray(jobListing.qualifications) 
        ? JSON.stringify(jobListing.qualifications) 
        : '[]',
      benefits: Array.isArray(jobListing.benefits) 
        ? JSON.stringify(jobListing.benefits) 
        : '[]',
    };

    // Only save translations if there's content to translate
    const hasTranslatableContent = Object.values(translationPayload).some(
      value => value && typeof value === 'string' && value.trim().length > 0
    );

    if (hasTranslatableContent) {
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
    contractType?: string;
    employmentType?: string;
    publishedOnly?: boolean;
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

    if (filters?.contractType) {
      where.contractType = filters.contractType;
    }

    if (filters?.employmentType) {
      where.employmentType = filters.employmentType;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { requirements: { has: filters.search } },
      ];
    }

    if (filters?.publishedOnly) {
      where.status = JobStatus.PUBLISHED;
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

    // Apply translations if lang is provided
    if (filters?.lang && filters.lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
      
      // TODO: N+1 QUERY PERFORMANCE ISSUE
      // Each listing triggers a separate resolveEntity call, resulting in N additional queries.
      // Consider implementing a batch resolution method in TranslationService:
      // const entityIds = jobListings.map(l => l.id);
      // const translationsMap = await this.translationService.resolveEntitiesBatch(
      //   'job_listing', entityIds, translatableFields, filters.lang
      // );
      // for (const listing of jobListings) {
      //   const translatedFields = translationsMap.get(listing.id);
      //   // ... apply translations
      // }
      
      for (const listing of jobListings) {
        const translatedFields = await this.translationService.resolveEntity(
          'job_listing',
          listing.id,
          translatableFields,
          filters.lang,
        );

        // Apply translated fields
        if (translatedFields.title) {
          listing.title = translatedFields.title;
        }
        if (translatedFields.description) {
          listing.description = translatedFields.description;
        }
        // Parse array fields from JSON strings
        if (translatedFields.requirements) {
          try {
            listing.requirements = JSON.parse(translatedFields.requirements);
          } catch {
            listing.requirements = [];
          }
        }
        if (translatedFields.responsibilities) {
          try {
            listing.responsibilities = JSON.parse(translatedFields.responsibilities);
          } catch {
            listing.responsibilities = [];
          }
        }
        if (translatedFields.qualifications) {
          try {
            listing.qualifications = JSON.parse(translatedFields.qualifications);
          } catch {
            listing.qualifications = [];
          }
        }
        if (translatedFields.benefits) {
          try {
            listing.benefits = JSON.parse(translatedFields.benefits);
          } catch {
            listing.benefits = [];
          }
        }
      }
    }

    return jobListings;
  }

  async findJobListingById(id: string, lang: string = 'en') {
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

    // Apply translations if lang is provided and not English
    if (lang && lang !== 'en') {
      const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
      
      const translatedFields = await this.translationService.resolveEntity(
        'job_listing',
        jobListing.id,
        translatableFields,
        lang,
      );

      // Apply translated fields
      if (translatedFields.title) {
        jobListing.title = translatedFields.title;
      }
      if (translatedFields.description) {
        jobListing.description = translatedFields.description;
      }
      // Split array fields back from joined strings
      if (translatedFields.requirements) {
        jobListing.requirements = translatedFields.requirements.split('\n').filter(r => r.trim().length > 0);
      }
      if (translatedFields.responsibilities) {
        jobListing.responsibilities = translatedFields.responsibilities.split('\n').filter(r => r.trim().length > 0);
      }
      if (translatedFields.qualifications) {
        jobListing.qualifications = translatedFields.qualifications.split('\n').filter(r => r.trim().length > 0);
      }
      if (translatedFields.benefits) {
        jobListing.benefits = translatedFields.benefits.split('\n').filter(r => r.trim().length > 0);
      }
    }

    return jobListing;
  }

  async updateJobListing(id: string, updateJobListingDto: UpdateJobListingDto) {
    const {
      requirements,
      responsibilities,
      qualifications,
      benefits,
      status,
      contractType,
      employmentType,
      workSchedule,
      startDate,
      ...rest
    } = updateJobListingDto;

    const parsedStartDate =
      startDate && startDate.trim()
        ? (() => {
            const date = new Date(startDate);
            return Number.isNaN(date.getTime()) ? undefined : date;
          })()
        : undefined;

    // Prisma Json fields must receive plain JSON values (not class instances).
    const workScheduleJson: Prisma.InputJsonValue | undefined = workSchedule
      ? (JSON.parse(JSON.stringify(workSchedule)) as Prisma.InputJsonValue)
      : undefined;

    const currentListing = await this.prisma.jobListing.findUnique({
      where: { id },
      select: { status: true, publishedAt: true },
    });

    const updatedJobListing = await this.prisma.jobListing.update({
      where: { id },
      data: {
        ...rest,
        ...(contractType ? { contractType } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(workSchedule ? { workSchedule: workScheduleJson } : {}),
        ...(parsedStartDate ? { startDate: parsedStartDate } : {}),
        ...(requirements ? { requirements } : {}),
        ...(responsibilities ? { responsibilities } : {}),
        ...(qualifications ? { qualifications } : {}),
        ...(benefits ? { benefits } : {}),
        ...(status
          ? {
              status,
              publishedAt:
                status === JobStatus.PUBLISHED
                  ? currentListing?.publishedAt ?? new Date()
                  : null,
            }
          : {}),
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

    // Update translations if translatable fields were changed
    const translatableFields = FIELDS_BY_ENTITY.job_listing || ['title', 'description', 'requirements'];
    const translationPayload: Record<string, any> = {
      title: updatedJobListing.title,
      description: updatedJobListing.description || '',
      requirements: Array.isArray(updatedJobListing.requirements) 
        ? updatedJobListing.requirements.join('\n') 
        : '',
      responsibilities: Array.isArray(updatedJobListing.responsibilities) 
        ? updatedJobListing.responsibilities.join('\n') 
        : '',
      qualifications: Array.isArray(updatedJobListing.qualifications) 
        ? updatedJobListing.qualifications.join('\n') 
        : '',
      benefits: Array.isArray(updatedJobListing.benefits) 
        ? updatedJobListing.benefits.join('\n') 
        : '',
    };

    // Only update translations if there's content to translate
    const hasTranslatableContent = Object.values(translationPayload).some(
      value => value && typeof value === 'string' && value.trim().length > 0
    );

    if (hasTranslatableContent) {
      await this.translationService.saveEntityWithTranslations(
        'job_listing',
        updatedJobListing.id,
        translationPayload,
        translatableFields,
      );
    }

    return updatedJobListing;
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
    try {
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

      if (translationPayload.cover_letter && translationPayload.cover_letter.trim().length > 0) {
        await this.translationService.saveEntityWithTranslations(
          'job_application',
          jobApplication.id,
          translationPayload,
          translatableFields,
        );
      }

      return jobApplication;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already applied for this job.');
      }
      throw error;
    }
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
    const updatedJobApplication = await this.prisma.jobApplication.update({
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

    // Update translations if cover_letter was changed
    if (updateJobApplicationDto.coverLetter !== undefined) {
      const translatableFields = FIELDS_BY_ENTITY.job_application || ['cover_letter'];
      const translationPayload: Record<string, any> = {
        cover_letter: updatedJobApplication.coverLetter || '',
      };

      if (translationPayload.cover_letter && translationPayload.cover_letter.trim().length > 0) {
        await this.translationService.saveEntityWithTranslations(
          'job_application',
          updatedJobApplication.id,
          translationPayload,
          translatableFields,
        );
      }
    }

    return updatedJobApplication;
  }

  async deleteJobApplication(id: string) {
    return this.prisma.jobApplication.delete({
      where: { id },
    });
  }

  async findJobApplicationsForJob(jobListingId: string) {
    return this.prisma.jobApplication.findMany({
      where: { jobListingId },
      include: {
        candidate: true,
        jobListing: {
          include: {
            foundation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobApplicationsForCandidate(candidateId: string) {
    return this.prisma.jobApplication.findMany({
      where: { candidateId },
      include: {
        jobListing: {
          include: {
            foundation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Candidate Management
  async findAllCandidates(filters?: {
    role?: string;
    skills?: string[];
    location?: string;
    search?: string;
    visibleOnly?: boolean;
  }) {
    const where: any = {};
    const andConditions: any[] = [];

    if (filters?.role) {
      // "role" in candidate pool context refers to the candidate's job role/title,
      // not the platform access role (which is always EDUCATOR for candidates).
      // Use case-insensitive matching for both legacy jobRole and new jobRoles array.
      const roleLower = filters.role.toLowerCase();
      const roleUpper = filters.role.toUpperCase();
      const roleCapitalized = filters.role.charAt(0).toUpperCase() + filters.role.slice(1).toLowerCase();
      andConditions.push({
        OR: [
          { jobRole: { equals: filters.role, mode: 'insensitive' } },
          { jobRoles: { hasSome: [filters.role, roleLower, roleUpper, roleCapitalized] } },
        ],
      });
    }

    if (filters?.skills && filters.skills.length > 0) {
      where.skills = { hasSome: filters.skills };
    }

    if (filters?.location) {
      // Use case-insensitive matching for both legacy region and new cities array.
      const locLower = filters.location.toLowerCase();
      const locUpper = filters.location.toUpperCase();
      const locCapitalized = filters.location.charAt(0).toUpperCase() + filters.location.slice(1).toLowerCase();
      andConditions.push({
        OR: [
          { region: { contains: filters.location, mode: 'insensitive' } },
          { cities: { hasSome: [filters.location, locLower, locUpper, locCapitalized] } },
        ],
      });
    }

    if (filters?.search) {
      // Search across multiple fields with case-insensitive matching.
      const searchLower = filters.search.toLowerCase();
      const searchUpper = filters.search.toUpperCase();
      const searchCapitalized = filters.search.charAt(0).toUpperCase() + filters.search.slice(1).toLowerCase();
      andConditions.push({
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { jobRole: { contains: filters.search, mode: 'insensitive' } },
          { jobRoles: { hasSome: [filters.search, searchLower, searchUpper, searchCapitalized] } },
          { region: { contains: filters.search, mode: 'insensitive' } },
          { cities: { hasSome: [filters.search, searchLower, searchUpper, searchCapitalized] } },
          { skills: { hasSome: [filters.search, searchLower, searchUpper, searchCapitalized] } },
          { certifications: { hasSome: [filters.search, searchLower, searchUpper, searchCapitalized] } },
        ],
      });
    }

    if (filters?.visibleOnly) {
      where.candidatePoolVisible = true;
    }

    // Combine all filter conditions with AND semantics
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.user.findMany({
      where: {
        ...where,
        role: 'EDUCATOR',
      },
      include: {
        avatarAsset: true,
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
        avatarAsset: true,
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
