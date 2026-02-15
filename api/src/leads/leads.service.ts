import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ParentLead, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentLeadDto } from './dto/create-parent-lead.dto';
import { UpdateParentLeadDto } from './dto/update-parent-lead.dto';
import { AppLoggerService } from '../common/logger.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { createHash } from 'crypto';

export type LeadResponseStatus = 'INTERESTED' | 'NOT_INTERESTED' | 'NEEDS_MORE_INFO' | 'ENROLLED';

export interface LeadWithResponses {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  childName: string;
  childAge: number;
  message: string | null;
  preferredLocation: string | null;
  preferredLanguages: string[];
  specialRequirements: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  foundationResponses: {
    id: string;
    foundationId: string;
    foundationName: string;
    status: string;
    message: string | null;
    respondedAt: Date;
  }[];
  myResponse?: {
    id: string;
    status: string;
    message: string | null;
    respondedAt: Date;
  };
}

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  // Parent Lead Management
  async createParentLead(createParentLeadDto: CreateParentLeadDto) {
    const parentEmail = createParentLeadDto.parentEmail.trim().toLowerCase();
    const parentName = createParentLeadDto.parentName.trim();
    const parentEmailHash = this.hashRecipient(parentEmail);
    const rawPreferredLocation = createParentLeadDto.preferredLocation?.trim();
    const preferredLocation =
      rawPreferredLocation && rawPreferredLocation.toLowerCase() === 'all'
        ? 'All'
        : rawPreferredLocation;

    const [linkedParentUser, lead] = await this.prisma.$transaction(async (tx) => {
      const existingParentUser = await tx.user.findFirst({
        where: {
          email: {
            equals: parentEmail,
            mode: 'insensitive',
          },
          role: UserRole.PARENT,
        },
        select: { id: true },
      });

      const createdLead = await tx.parentLead.create({
        data: {
          parentName,
          parentEmail,
          parentPhone: createParentLeadDto.parentPhone?.trim() || undefined,
          childName: createParentLeadDto.childName.trim(),
          childAge: createParentLeadDto.childAge,
          message: createParentLeadDto.message?.trim() || undefined,
          preferredLocation: preferredLocation || undefined,
          preferredCities: this.normalizeStringArray(createParentLeadDto.preferredCities),
          preferredLanguages: this.normalizeStringArray(createParentLeadDto.preferredLanguages),
          specialRequirements: createParentLeadDto.specialRequirements?.trim() || undefined,
          foundationId: createParentLeadDto.foundationId,
          status: createParentLeadDto.status || undefined,
          parentUserId: existingParentUser?.id,
        },
      });

      return [existingParentUser, createdLead] as const;
    });

    if (linkedParentUser?.id) {
      this.logger.log(
        `Linked lead ${lead.id} to parent user ${linkedParentUser.id} during creation`,
        'LeadsService',
        { leadId: lead.id, parentUserId: linkedParentUser.id, parentEmailHash },
      );
    }

    // Fire-and-forget: the email sender catches/logs its own errors.
    void this.sendParentLeadConfirmationEmail(lead);

    return lead;
  }

  /**
   * Systematically links orphan leads to a parent account by email.
   * Called after account creation/profile completion and safe to run repeatedly.
   */
  async linkLeadsToParentAccount(parentUserId: string, parentEmail: string): Promise<number> {
    const normalizedEmail = parentEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      return 0;
    }
    const parentEmailHash = this.hashRecipient(normalizedEmail);

    const result = await this.prisma.parentLead.updateMany({
      where: {
        parentUserId: null,
        parentEmail: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      data: {
        parentUserId,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Linked ${result.count} existing lead(s) to parent account ${parentUserId}`,
        'LeadsService',
        { parentUserId, parentEmailHash, linkedCount: result.count },
      );
    }

    return result.count;
  }

  private normalizeStringArray(values?: string[]): string[] {
    return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
  }

  private hashRecipient(email: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return 'unknown';
    }
    return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  }

  private getFrontendBaseUrl(): string {
    const configuredUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return configuredUrl.trim().replace(/\/+$/g, '');
  }

  private async sendParentLeadConfirmationEmail(lead: ParentLead): Promise<void> {
    let recipientHash = 'unknown';
    try {
      const frontendUrl = this.getFrontendBaseUrl();
      const accountSetupUrl = `${frontendUrl}/signup?fromLead=1&role=parent`;
      const enquiriesUrl = `${frontendUrl}/parent/enquiries`;
      recipientHash = this.hashRecipient(lead.parentEmail);

      const sent = await this.emailNotificationService.sendNotification({
        event: 'parent_lead_confirmation',
        recipient: lead.parentEmail,
        allowUnknownRecipient: true,
        bypassPreferences: true,
        payload: {
          parentName: lead.parentName,
          enquiryReference: lead.id.slice(0, 8).toUpperCase(),
          submittedAt: lead.createdAt.toISOString(),
          childAge: lead.childAge,
          location: lead.preferredLocation || 'Not specified',
          message: lead.message || lead.specialRequirements || 'No additional details provided.',
          accountSetupUrl,
          enquiriesUrl,
        },
      });

      if (!sent) {
        this.logger.warn(
          `Parent lead confirmation email could not be sent for lead ${lead.id}`,
          'LeadsService',
          { leadId: lead.id, recipientHash },
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Parent lead confirmation email failed for lead ${lead.id}: ${error?.message || String(error)}`,
        error?.stack,
        'LeadsService',
        { leadId: lead.id, recipientHash },
      );
    }
  }

  async findAllParentLeads(filters?: {
    foundationId?: string;
    status?: string;
    location?: string;
    childAge?: number;
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
      where.preferredLocation = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters?.childAge) {
      where.childAge = filters.childAge;
    }

    if (filters?.search) {
      where.OR = [
        { parentName: { contains: filters.search, mode: 'insensitive' } },
        { childName: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.parentLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findParentLeadById(id: string) {
    return this.prisma.parentLead.findUnique({
      where: { id },
    });
  }

  async updateParentLead(id: string, updateParentLeadDto: UpdateParentLeadDto) {
    const normalizedPreferredLocation =
      updateParentLeadDto.preferredLocation !== undefined
        ? (updateParentLeadDto.preferredLocation?.trim().toLowerCase() === 'all'
            ? 'All'
            : updateParentLeadDto.preferredLocation?.trim() || null)
        : undefined;

    return this.prisma.parentLead.update({
      where: { id },
      data: {
        ...updateParentLeadDto,
        ...(normalizedPreferredLocation !== undefined && {
          preferredLocation: normalizedPreferredLocation || undefined,
        }),
      },
    });
  }

  async deleteParentLead(id: string) {
    return this.prisma.parentLead.delete({
      where: { id },
    });
  }

  // Auto Matching Algorithm
  async findMatchingFoundations(leadId: string) {
    const lead = await this.prisma.parentLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const where: any = {
      type: 'FOUNDATION',
    };

    // Canton/Location matching - match against canton or regionsServed
    // Treat "All" as no preferred location filter.
    if (lead.preferredLocation && lead.preferredLocation !== 'All') {
      where.OR = [
        { canton: { equals: lead.preferredLocation, mode: 'insensitive' } },
        // Backwards-compat: treat a sentinel stored in the single-value canton field as global coverage.
        { canton: { equals: 'All', mode: 'insensitive' } },
        { regionsServed: { has: lead.preferredLocation } },
        // NOTE: `{ has: 'All' }` is case-sensitive. Keep writes canonical as exactly "All".
        { regionsServed: { has: 'All' } },
        { region: { contains: lead.preferredLocation, mode: 'insensitive' } },
      ];
    }

    // Language matching
    if (lead.preferredLanguages && lead.preferredLanguages.length > 0) {
      where.languages = { hasSome: lead.preferredLanguages };
    }

    // Age-appropriate capacity (simplified logic)
    if (lead.childAge) {
      // Assume foundations can handle children of this age
      where.capacity = { gte: 1 };
    }

    const foundations = await this.prisma.organization.findMany({
      where,
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    // Score and rank foundations based on match criteria
    const scoredFoundations = foundations.map(foundation => {
      let score = 0;

      // Canton/Location match (30 points)
      if (lead.preferredLocation && lead.preferredLocation !== 'All') {
        const cantonMatch =
          foundation.canton?.toLowerCase() === lead.preferredLocation.toLowerCase();
        const globalCantonMatch = foundation.canton?.toLowerCase() === 'all';
        const regionsMatch = foundation.regionsServed?.some(
          r =>
            r.toLowerCase() === lead.preferredLocation!.toLowerCase() ||
            r.toLowerCase() === 'all'
        );
        const regionMatch = foundation.region?.toLowerCase().includes(lead.preferredLocation.toLowerCase());
        
        if (cantonMatch || globalCantonMatch || regionsMatch || regionMatch) {
          score += 30;
        }
      }

      // City match (40 points) - case-insensitive matching
      // If parent specified preferred cities, check if foundation's city matches any of them
      if (lead.preferredCities && lead.preferredCities.length > 0 && foundation.city) {
        const foundationCityLower = foundation.city.toLowerCase().trim();
        const cityMatch = lead.preferredCities.some(
          city => city.toLowerCase().trim() === foundationCityLower
        );
        if (cityMatch) {
          score += 40;
        }
      }

      // Language match (20 points)
      if (lead.preferredLanguages && lead.preferredLanguages.length > 0 && foundation.languages) {
        const matchingLanguages = lead.preferredLanguages.filter(lang =>
          foundation.languages.some(fLang => fLang.toLowerCase() === lang.toLowerCase()),
        );
        score += (matchingLanguages.length / lead.preferredLanguages.length) * 20;
      }

      // Capacity availability (5 points)
      if (foundation.capacity && foundation.capacity > 0) {
        score += 5;
      }

      // Pedagogy match (5 points)
      if (foundation.pedagogy && foundation.pedagogy.length > 0) {
        score += 5;
      }

      return {
        ...foundation,
        matchScore: score,
      };
    });

    // Filter out foundations with no city match if cities were specified
    // This ensures we only return relevant daycares based on location
    let filteredFoundations = scoredFoundations;
    if (lead.preferredCities && lead.preferredCities.length > 0) {
      filteredFoundations = scoredFoundations.filter(foundation => {
        if (!foundation.city) return false;
        const foundationCityLower = foundation.city.toLowerCase().trim();
        return lead.preferredCities!.some(
          city => city.toLowerCase().trim() === foundationCityLower
        );
      });
      
      // If no city matches found, fall back to canton-level matches
      if (filteredFoundations.length === 0) {
        filteredFoundations = scoredFoundations;
      }
    }

    // Sort by match score descending
    return filteredFoundations.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Lead Assignment
  async assignLeadToFoundation(leadId: string, foundationId: string) {
    return this.prisma.parentLead.update({
      where: { id: leadId },
      data: {
        foundationId,
        status: 'ASSIGNED',
      },
    });
  }

  // Lead Status Management
  async updateLeadStatus(leadId: string, status: string) {
    return this.prisma.parentLead.update({
      where: { id: leadId },
      data: { status },
    });
  }

  // Lead Generation (Webhook/API endpoint for external sources)
  async generateLeadFromExternalSource(leadData: {
    parentName: string;
    parentEmail: string;
    parentPhone?: string;
    childName: string;
    childAge: number;
    message?: string;
    preferredLocation?: string;
    preferredLanguages?: string[];
    specialRequirements?: string;
    source?: string;
  }) {
    return this.prisma.parentLead.create({
      data: {
        ...leadData,
        status: 'NEW',
        source: leadData.source || 'EXTERNAL',
      },
    });
  }

  // Analytics
  async getLeadsStats() {
    const [
      totalLeads,
      newLeads,
      assignedLeads,
      convertedLeads,
      totalFoundations,
    ] = await Promise.all([
      this.prisma.parentLead.count(),
      this.prisma.parentLead.count({ where: { status: 'NEW' } }),
      this.prisma.parentLead.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.parentLead.count({ where: { status: 'CONVERTED' } }),
      this.prisma.organization.count({ where: { type: 'FOUNDATION' } }),
    ]);

    return {
      totalLeads,
      newLeads,
      assignedLeads,
      convertedLeads,
      totalFoundations,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }

  // Lead Distribution
  async distributeLeadsToFoundations() {
    const newLeads = await this.prisma.parentLead.findMany({
      where: { status: 'NEW' },
    });

    const results = [];

    for (const lead of newLeads) {
      try {
        const matchingFoundations = await this.findMatchingFoundations(lead.id);
        
        if (matchingFoundations.length > 0) {
          // Assign to the best matching foundation
          const bestMatch = matchingFoundations[0];
          await this.assignLeadToFoundation(lead.id, bestMatch.id);
          
          results.push({
            leadId: lead.id,
            assignedTo: bestMatch.id,
            matchScore: bestMatch.matchScore,
          });
        }
      } catch (error) {
        this.logger.error(`Error processing lead ${lead.id}`, (error as Error).stack, 'LeadsService', { leadId: lead.id });
      }
    }

    return results;
  }

  // Notification System (placeholder for future implementation)
  async notifyFoundationOfNewLead(foundationId: string, leadId: string) {
    // This would integrate with a notification service
    // For now, we'll just log it
    this.logger.log(`Notifying foundation ${foundationId} of new lead ${leadId}`, 'LeadsService', { 
      foundationId, 
      leadId 
    });
    
    // In a real implementation, this would:
    // 1. Send email notification
    // 2. Send push notification
    // 3. Create in-app notification
    // 4. Send SMS if configured
    
    return { success: true, message: 'Notification sent' };
  }

  // ============================================
  // FOUNDATION-SPECIFIC LEAD MANAGEMENT
  // ============================================

  /**
   * Get leads for a specific foundation
   * Returns leads that are:
   * 1. Directly assigned to the foundation
   * 2. Have responses from the foundation
   * 3. Are new/unassigned and match the foundation's criteria
   */
  async getFoundationLeads(
    foundationId: string,
    filters?: {
      status?: string;
      search?: string;
      responseStatus?: string;
    },
  ): Promise<LeadWithResponses[]> {
    // Get the foundation's details for matching
    const foundation = await this.prisma.organization.findUnique({
      where: { id: foundationId },
      select: { region: true, canton: true, languages: true },
    });

    // Build the base foundation-scoping conditions
    const foundationLocation = (foundation?.canton || foundation?.region || '').trim();
    const hasGlobalLocation = foundationLocation.toLowerCase() === 'all';

    const foundationScopeConditions = [
      // Leads directly assigned to this foundation
      { foundationId: foundationId },
      // Leads with responses from this foundation
      {
        foundationResponses: {
          some: { foundationId: foundationId },
        },
      },
      // New leads that might match (unassigned)
      {
        status: 'NEW',
        foundationId: null,
        // If the foundation is global (canton/region === "All"), do NOT apply a location filter.
        // Also include "All"/unset leads for canton-specific foundations so broad enquiries surface.
        ...(!foundationLocation || hasGlobalLocation
          ? {}
          : {
              OR: [
                {
                  preferredLocation: {
                    contains: foundationLocation,
                    mode: 'insensitive' as const,
                  },
                },
                { preferredLocation: { equals: 'All', mode: 'insensitive' as const } },
                { preferredLocation: null },
                { preferredLocation: '' },
              ],
            }),
      },
    ];

    // Build the where clause with proper AND composition
    const whereClause: any = {
      AND: [
        // Foundation scope (must match one of these)
        { OR: foundationScopeConditions },
        // Status filter (if provided)
        ...(filters?.status ? [{ status: filters.status }] : []),
        // Search filter (if provided) - search across multiple fields
        ...(filters?.search
          ? [
              {
                OR: [
                  { parentName: { contains: filters.search, mode: 'insensitive' as const } },
                  { childName: { contains: filters.search, mode: 'insensitive' as const } },
                  { message: { contains: filters.search, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
    };

    // Build the query
    const leads = await this.prisma.parentLead.findMany({
      where: whereClause,
      include: {
        foundationResponses: {
          include: {
            foundation: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform and filter by response status if needed
    let result: LeadWithResponses[] = leads.map((lead) => {
      const myResponse = lead.foundationResponses.find((r) => r.foundationId === foundationId);
      return {
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
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        foundationResponses: lead.foundationResponses.map((r) => ({
          id: r.id,
          foundationId: r.foundationId,
          foundationName: r.foundation.name,
          status: r.status,
          message: r.message,
          respondedAt: r.respondedAt,
        })),
        myResponse: myResponse
          ? {
              id: myResponse.id,
              status: myResponse.status,
              message: myResponse.message,
              respondedAt: myResponse.respondedAt,
            }
          : undefined,
      };
    });

    // Filter by response status if specified
    if (filters?.responseStatus) {
      if (filters.responseStatus === 'NOT_RESPONDED') {
        result = result.filter((lead) => !lead.myResponse);
      } else {
        result = result.filter((lead) => lead.myResponse?.status === filters.responseStatus);
      }
    }

    return result;
  }

  /**
   * Get a single lead with all foundation responses
   */
  async getLeadWithResponses(leadId: string, foundationId?: string): Promise<LeadWithResponses> {
    const lead = await this.prisma.parentLead.findUnique({
      where: { id: leadId },
      include: {
        foundationResponses: {
          include: {
            foundation: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const myResponse = foundationId
      ? lead.foundationResponses.find((r) => r.foundationId === foundationId)
      : undefined;

    return {
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
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      foundationResponses: lead.foundationResponses.map((r) => ({
        id: r.id,
        foundationId: r.foundationId,
        foundationName: r.foundation.name,
        status: r.status,
        message: r.message,
        respondedAt: r.respondedAt,
      })),
      myResponse: myResponse
        ? {
            id: myResponse.id,
            status: myResponse.status,
            message: myResponse.message,
            respondedAt: myResponse.respondedAt,
          }
        : undefined,
    };
  }

  /**
   * Create or update a foundation's response to a lead
   */
  async respondToLead(
    leadId: string,
    foundationId: string,
    status: LeadResponseStatus,
    message?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verify lead exists
      const lead = await tx.parentLead.findUnique({
        where: { id: leadId },
        include: {
          foundationResponses: {
            where: { foundationId },
          },
        },
      });

      if (!lead) {
        throw new NotFoundException(`Lead with ID ${leadId} not found`);
      }

      // Authorization check: Foundation can only respond to leads that are:
      // 1. Directly assigned to them
      // 2. Already have a response from them
      // 3. New/unassigned leads
      const isAssignedToFoundation = lead.foundationId === foundationId;
      const hasExistingResponse = lead.foundationResponses.length > 0;
      const isNewOrUnassigned = lead.status === 'NEW' && lead.foundationId === null;

      if (!isAssignedToFoundation && !hasExistingResponse && !isNewOrUnassigned) {
        throw new NotFoundException(`Lead with ID ${leadId} not accessible to this foundation`);
      }

      // Verify foundation exists
      const foundation = await tx.organization.findUnique({
        where: { id: foundationId },
      });

      if (!foundation) {
        throw new NotFoundException(`Foundation with ID ${foundationId} not found`);
      }

      // Create or update the response
      const response = await tx.foundationLeadResponse.upsert({
        where: {
          leadId_foundationId: {
            leadId,
            foundationId,
          },
        },
        update: {
          status,
          message,
          respondedAt: new Date(),
        },
        create: {
          leadId,
          foundationId,
          status,
          message,
        },
      });

      // Determine new lead status based on response
      let newLeadStatus = lead.status;
      const updateData: { status?: string; foundationId?: string } = {};

      if (status === 'INTERESTED' || status === 'NEEDS_MORE_INFO') {
        newLeadStatus = 'PROCESSING';
      } else if (status === 'ENROLLED') {
        newLeadStatus = 'CONVERTED';
        // If enrolled, assign the lead to this foundation
        updateData.foundationId = foundationId;
      } else if (lead.status === 'NEW') {
        newLeadStatus = 'CONTACTED';
      }

      // Only update if status changed (single update, avoid duplicate)
      if (newLeadStatus !== lead.status || updateData.foundationId) {
        updateData.status = newLeadStatus;
        await tx.parentLead.update({
          where: { id: leadId },
          data: updateData,
        });
      }

      this.logger.log(
        `Foundation ${foundationId} responded to lead ${leadId} with status ${status}`,
        'LeadsService',
        { leadId, foundationId, status },
      );

      return {
        success: true,
        response: {
          id: response.id,
          status: response.status,
          message: response.message,
          respondedAt: response.respondedAt,
        },
        leadStatus: newLeadStatus,
      };
    });
  }

  /**
   * Get foundation's response statistics
   */
  async getFoundationResponseStats(foundationId: string) {
    const [totalResponses, byStatus] = await Promise.all([
      this.prisma.foundationLeadResponse.count({
        where: { foundationId },
      }),
      this.prisma.foundationLeadResponse.groupBy({
        by: ['status'],
        where: { foundationId },
        _count: { id: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of byStatus) {
      statusCounts[item.status] = item._count.id;
    }

    return {
      totalResponses,
      interested: statusCounts['INTERESTED'] || 0,
      notInterested: statusCounts['NOT_INTERESTED'] || 0,
      needsMoreInfo: statusCounts['NEEDS_MORE_INFO'] || 0,
      enrolled: statusCounts['ENROLLED'] || 0,
    };
  }
}