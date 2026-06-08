import { Injectable, ForbiddenException } from '@nestjs/common';
import { ApplicationStatus, JobContractType } from '@prisma/client';
import { RecruitmentService } from '../../../recruitment/recruitment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  isAdminRole,
  resolveOnBehalfOrgId,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';
// resolveOnBehalfOrgId pins non-admins to their own org and rejects cross-org
// overrides, so foundationId can never be spoofed from another tenant.

// Normalize free-text contract type (e.g. "part-time 60%", "CDI") to enum.
// Returns undefined when no recognisable pattern is found so the DB default is used.
function normalizeContractType(raw: string | undefined): JobContractType | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().replace(/[^a-z_]/g, ' ').trim();
  if (JobContractType[raw.toUpperCase() as keyof typeof JobContractType]) {
    return raw.toUpperCase() as JobContractType;
  }
  if (/part.?time|partiel|teilzeit/.test(s)) return JobContractType.PART_TIME;
  if (/full.?time|plein.?temps|vollzeit/.test(s)) return JobContractType.FULL_TIME;
  if (/\bcdi\b/.test(s)) return JobContractType.CDI;
  if (/\bcdd\b/.test(s)) return JobContractType.CDD;
  if (/intern|stage/.test(s)) return JobContractType.INTERNSHIP;
  if (/replac|remplac|vertret/.test(s)) return JobContractType.REPLACEMENT;
  if (/temp(orar)?|befrist/.test(s)) return JobContractType.TEMPORARY;
  if (/freelanc|independ|selbst/.test(s)) return JobContractType.FREELANCE;
  return undefined;
}

/**
 * L3 recruitment write actions: posting jobs, applying, shortlisting, and moving
 * applications through the hiring pipeline. Each runs only after the user
 * confirms the action via the orchestrator's approval card.
 */
@Injectable()
export class RecruitmentWriteHandler implements ToolHandler {
  readonly toolNames = [
    'post_job',
    'apply_to_job',
    'shortlist_candidate',
    'update_application_status',
  ];

  constructor(
    private readonly recruitment: RecruitmentService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'post_job':
        return this.postJob(args, principal);
      case 'apply_to_job':
        return this.applyToJob(args, principal);
      case 'shortlist_candidate':
        return this.shortlistCandidate(args, principal);
      case 'update_application_status':
        return this.updateApplicationStatus(args, principal);
      default:
        throw new Error(`RecruitmentWriteHandler cannot handle tool "${toolName}"`);
    }
  }

  // ── post_job ──────────────────────────────────────────────────────────────
  private async postJob(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    // Admins may post on behalf of a foundation (resolve the ID with
    // find_foundation first); foundations post for their own org.
    const foundationId = resolveOnBehalfOrgId(args, principal);
    if (!foundationId) {
      throw new Error('A foundationId is required to post a job. Resolve it with find_foundation first.');
    }

    const role = (args.role as string) || undefined;
    const percentage = args.percentage != null ? Number(args.percentage) : undefined;
    const title =
      (args.title as string) ||
      [role, percentage ? `${percentage}%` : undefined].filter(Boolean).join(' ') ||
      'New position';

    const listing = await this.recruitment.createJobListing(
      {
        title,
        description: (args.description as string) || undefined,
        location: (args.location as string) || (args.canton as string) || undefined,
        contractType: normalizeContractType(args.contractType as string | undefined),
        startDate: (args.startDate as string) || undefined,
        // Publish immediately so the posting is live once the user confirms.
        status: 'PUBLISHED' as any,
      },
      foundationId,
    );

    return {
      data: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
        location: listing.location ?? null,
      },
      total: 1,
    };
  }

  // ── apply_to_job (educator) ───────────────────────────────────────────────
  private async applyToJob(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const jobListingId = (args.jobListingId as string) || (args.jobId as string);
    if (!jobListingId) {
      throw new Error('A jobListingId is required to apply.');
    }
    const application = await this.recruitment.createJobApplication(
      {
        jobListingId,
        coverLetter: (args.coverLetter as string) || undefined,
      },
      principal.userId,
    );
    return {
      data: { id: application.id, status: application.status, jobListingId },
      total: 1,
    };
  }

  // ── shortlist_candidate (foundation) ──────────────────────────────────────
  private async shortlistCandidate(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const foundationId = resolveOnBehalfOrgId(args, principal);
    if (!foundationId) {
      throw new Error('A foundationId is required to shortlist a candidate.');
    }
    const candidateId = (args.candidateId as string) || (args.id as string);
    if (!candidateId) {
      throw new Error('A candidateId is required to shortlist a candidate.');
    }
    const saved = await this.recruitment.saveCandidate(foundationId, candidateId);
    return { data: { candidateId, saved: Boolean(saved) }, total: 1 };
  }

  // ── update_application_status (foundation) ────────────────────────────────
  private async updateApplicationStatus(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const id = (args.applicationId as string) || (args.id as string);
    const rawStatus = ((args.status as string) || '').toUpperCase();
    if (!id) throw new Error('An applicationId is required.');
    if (!rawStatus) throw new Error('A target status is required.');

    const valid = Object.values(ApplicationStatus) as string[];
    if (!valid.includes(rawStatus)) {
      throw new Error(`Invalid application status "${rawStatus}". Must be one of: ${valid.join(', ')}.`);
    }
    const status = rawStatus as ApplicationStatus;

    // Authorization: the service updates by ID with no scoping, so the handler
    // must confirm the application belongs to the caller's foundation (admins
    // may act on any). Without this a foundation could mutate another org's
    // applications.
    if (!isAdminRole(principal.role)) {
      const application = await this.prisma.jobApplication.findUnique({
        where: { id },
        select: { jobListing: { select: { foundationId: true } } },
      });
      if (!application) throw new Error('Application not found.');
      if (application.jobListing?.foundationId !== principal.organizationId) {
        throw new ForbiddenException('You can only update applications for your own job listings.');
      }
    }

    const updated = await this.recruitment.updateJobApplication(id, { status });
    return { data: { id, status: updated.status }, total: 1 };
  }
}
