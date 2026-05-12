import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobListingDto } from './dto/create-job-listing.dto';
import { UpdateJobListingDto } from './dto/update-job-listing.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationDto } from './dto/create-job-application.dto';
import { JobContractType, JobStatus } from '@workspace/types';
import { JobEmploymentType, Prisma } from '@prisma/client';
import { TranslationService } from '../translation/translation.service';
import { FIELDS_BY_ENTITY } from '../translation/translation.config';
import { EmailNotificationService } from '../email-notification/email-notification.service';

/** Candidate scored by the v2 matching algorithm. */
export interface ScoredCandidate {
  candidate: any;
  score: number;
  reasons: string[];
}

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);
  private readonly matchEmailLimit = parseInt(process.env.STAFFING_MATCH_EMAIL_LIMIT ?? '20', 10);

  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
    private emailNotification: EmailNotificationService,
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
      ? (instanceToPlain(workSchedule) as Prisma.InputJsonValue)
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
      ? (instanceToPlain(workSchedule) as Prisma.InputJsonValue)
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

    // Fan-out job_match emails when transitioning to PUBLISHED (non-blocking)
    if (status === JobStatus.PUBLISHED && currentListing?.status !== JobStatus.PUBLISHED) {
      this.notifyMatchingCandidatesOfJob(updatedJobListing).catch((err) =>
        this.logger.error('job_match fan-out failed', err?.message),
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

      // Notify foundation members of new application (non-blocking)
      this.notifyFoundationOfNewApplication(jobApplication).catch((err) =>
        this.logger.error('new_application email failed', err?.message),
      );

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
    const previous = await this.prisma.jobApplication.findUnique({
      where: { id },
      select: { status: true },
    });

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

    // Notify candidate when status changes (non-blocking)
    if (updateJobApplicationDto.status && updateJobApplicationDto.status !== previous?.status) {
      this.notifyCandidateOfStatusUpdate(updatedJobApplication).catch((err) =>
        this.logger.error('application_status_update email failed', err?.message),
      );
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
        // Exclude suspended / inactive educators from the candidate pool.
        // Use { not: false } so legacy rows with null isActive are treated
        // as active, consistent with the rest of the codebase.
        isActive: { not: false },
      },
      include: {
        avatarAsset: true,
        workExperienceItems: { orderBy: { sortOrder: 'asc' } },
        educationItems: { orderBy: { sortOrder: 'asc' } },
        certificationItems: { orderBy: { sortOrder: 'asc' } },
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

  async findCandidateById(id: string, options?: { visibleOnly?: boolean }) {
    return this.prisma.user.findUnique({
      where: {
        id,
        // Exclude suspended / inactive educators so their profile cannot
        // be viewed individually either.  Uses { not: false } so legacy
        // rows with null isActive are treated as active.
        isActive: { not: false },
        // When visibleOnly is set, only return educators who opted into
        // the candidate pool.  This prevents foundation users from viewing
        // profiles of educators who removed themselves from the pool
        // (e.g. via a previously bookmarked URL).
        ...(options?.visibleOnly ? { candidatePoolVisible: true } : {}),
      },
      include: {
        avatarAsset: true,
        workExperienceItems: { orderBy: { sortOrder: 'asc' } },
        educationItems: { orderBy: { sortOrder: 'asc' } },
        certificationItems: { orderBy: { sortOrder: 'asc' } },
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

  // Matching Algorithm — v2 weighted scorer
  // Weights: role 40 | city 25 | skills 15 | availability 15 | recency 5
  async findMatchingCandidates(jobListingId: string): Promise<ScoredCandidate[]> {
    const jobListing = await this.prisma.jobListing.findUnique({
      where: { id: jobListingId },
      include: { foundation: true },
    });

    if (!jobListing) {
      throw new Error('Job listing not found');
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        role: 'EDUCATOR',
        isActive: { not: false },
        candidatePoolVisible: true,
      },
      include: {
        workExperienceItems: { orderBy: { sortOrder: 'asc' } },
        educationItems: { orderBy: { sortOrder: 'asc' } },
        certificationItems: { orderBy: { sortOrder: 'asc' } },
        applications: { where: { jobListingId } },
      },
    });

    const jobLocation = (jobListing.location ?? '').toLowerCase();
    const jobTitleWords = (jobListing.title ?? '').toLowerCase().split(/\s+/);
    const jobRequirements: string[] = Array.isArray(jobListing.requirements)
      ? (jobListing.requirements as string[]).map((r: string) => r.toLowerCase())
      : [];
    const workSchedule = jobListing.workSchedule as Record<string, unknown> | null;

    const scored: ScoredCandidate[] = candidates
      .filter((c) => c.applications.length === 0)
      .map((candidate) => {
        let score = 0;
        const reasons: string[] = [];

        // Role match — 40 pts
        const candidateRoles: string[] = [
          ...(candidate.jobRole ? [candidate.jobRole.toLowerCase()] : []),
          ...(Array.isArray(candidate.jobRoles)
            ? (candidate.jobRoles as string[]).map((r: string) => r.toLowerCase())
            : []),
        ];
        const roleMatch = candidateRoles.some((r) =>
          jobTitleWords.some((w) => w.length > 3 && (r.includes(w) || w.includes(r))),
        );
        if (roleMatch) {
          score += 40;
          reasons.push('Role match');
        }

        // City overlap — 25 pts
        const candidateCities: string[] = Array.isArray(candidate.cities)
          ? (candidate.cities as string[]).map((c: string) => c.toLowerCase())
          : [];
        const candidateRegion = (candidate.region ?? '').toLowerCase();
        const locationMatch =
          (jobLocation &&
            candidateCities.some(
              (city) => jobLocation.includes(city) || city.includes(jobLocation),
            )) ||
          (candidateRegion &&
            jobLocation &&
            (jobLocation.includes(candidateRegion) || candidateRegion.includes(jobLocation)));
        if (locationMatch) {
          score += 25;
          reasons.push('Location match');
        }

        // Skills intersection — 15 pts (pro-rated)
        const candidateSkills: string[] = Array.isArray(candidate.skills)
          ? (candidate.skills as string[]).map((s: string) => s.toLowerCase())
          : [];
        if (jobRequirements.length > 0 && candidateSkills.length > 0) {
          const overlap = jobRequirements.filter((req) =>
            candidateSkills.some((skill) => skill.includes(req) || req.includes(skill)),
          ).length;
          const skillScore = Math.round((overlap / jobRequirements.length) * 15);
          if (skillScore > 0) {
            score += skillScore;
            reasons.push(`${overlap}/${jobRequirements.length} requirements matched`);
          }
        }

        // Availability overlap — 15 pts
        if (workSchedule && candidate.availability) {
          score += 15;
          reasons.push('Availability match');
        } else if (candidate.availability) {
          score += 8;
        }

        // Recency bonus — up to 5 pts
        if (candidate.updatedAt) {
          const daysSince = (Date.now() - new Date(candidate.updatedAt).getTime()) / 86_400_000;
          if (daysSince <= 30) {
            score += 5;
            reasons.push('Recently active');
          } else if (daysSince <= 90) {
            score += 3;
          } else if (daysSince <= 180) {
            score += 1;
          }
        }

        return { candidate, score, reasons };
      });

    return scored.sort((a, b) => b.score - a.score);
  }

  // Shortlist (savedCandidateIds on Organization)
  async getSavedCandidates(foundationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: foundationId },
      select: { savedCandidateIds: true },
    });
    const ids: string[] = Array.isArray(org?.savedCandidateIds)
      ? (org.savedCandidateIds as string[])
      : [];
    if (!ids.length) return [];
    return this.prisma.user.findMany({
      where: { id: { in: ids }, role: 'EDUCATOR' },
      include: { avatarAsset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveCandidate(foundationId: string, candidateId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: foundationId },
      select: { savedCandidateIds: true },
    });
    const ids: string[] = Array.isArray(org?.savedCandidateIds)
      ? [...(org.savedCandidateIds as string[])]
      : [];
    if (!ids.includes(candidateId)) ids.push(candidateId);
    await this.prisma.organization.update({
      where: { id: foundationId },
      data: { savedCandidateIds: ids },
    });
    return ids;
  }

  async unsaveCandidate(foundationId: string, candidateId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: foundationId },
      select: { savedCandidateIds: true },
    });
    const ids = ((org?.savedCandidateIds as string[]) ?? []).filter((i) => i !== candidateId);
    await this.prisma.organization.update({
      where: { id: foundationId },
      data: { savedCandidateIds: ids },
    });
    return ids;
  }

  // Private notification helpers
  private async notifyFoundationOfNewApplication(application: any) {
    const foundationId = application.jobListing?.foundationId;
    if (!foundationId) return;
    const members = await this.prisma.user.findMany({
      where: {
        organizations: { some: { organizationId: foundationId } },
        role: { in: ['FOUNDATION' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any] },
        isActive: { not: false },
      },
      select: { email: true, firstName: true },
    });
    for (const member of members) {
      if (!member.email) continue;
      await this.emailNotification.sendNotification({
        event: 'new_application',
        recipient: member.email,
        recipientName: member.firstName ?? undefined,
        payload: {
          firstName: member.firstName ?? 'Team',
          jobTitle: application.jobListing?.title ?? 'Job',
          candidateName: `${application.candidate?.firstName ?? ''} ${application.candidate?.lastName ?? ''}`.trim() || 'Candidate',
          dashboardUrl: `${process.env.APP_URL ?? ''}/staffing/applications`,
        },
        bypassPreferences: false,
      });
    }
  }

  private async notifyCandidateOfStatusUpdate(application: any) {
    const candidate = application.candidate;
    if (!candidate?.email) return;
    await this.emailNotification.sendNotification({
      event: 'application_status_update',
      recipient: candidate.email,
      recipientName: candidate.firstName ?? undefined,
      payload: {
        firstName: candidate.firstName ?? 'Candidate',
        jobTitle: application.jobListing?.title ?? 'Job',
        foundationName: application.jobListing?.foundation?.name ?? 'Organization',
        newStatus: application.status,
        dashboardUrl: `${process.env.APP_URL ?? ''}/staffing/applications`,
      },
      bypassPreferences: false,
    });
  }

  private async notifyMatchingCandidatesOfJob(jobListing: any) {
    const scored = await this.findMatchingCandidates(jobListing.id);
    const toNotify = scored.slice(0, this.matchEmailLimit);
    for (const { candidate } of toNotify) {
      if (!candidate.email) continue;
      await this.emailNotification.sendNotification({
        event: 'job_match',
        recipient: candidate.email,
        recipientName: candidate.firstName ?? undefined,
        payload: {
          firstName: candidate.firstName ?? 'Candidate',
          jobTitle: jobListing.title,
          foundationName: jobListing.foundation?.name ?? 'Organization',
          location: jobListing.location ?? 'N/A',
          contractType: jobListing.contractType,
          applyUrl: `${process.env.APP_URL ?? ''}/recruitment`,
        },
        bypassPreferences: false,
      });
    }
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
