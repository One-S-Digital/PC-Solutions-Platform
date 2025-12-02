import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentLeadDto } from './dto/create-parent-lead.dto';
import { UpdateParentLeadDto } from './dto/update-parent-lead.dto';
import { AppLoggerService } from '../common/logger.service';

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
  ) {}

  // Parent Lead Management
  async createParentLead(createParentLeadDto: CreateParentLeadDto) {
    return this.prisma.parentLead.create({
      data: createParentLeadDto,
    });
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
    return this.prisma.parentLead.update({
      where: { id },
      data: updateParentLeadDto,
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

    // Location matching
    if (lead.preferredLocation) {
      where.region = { contains: lead.preferredLocation, mode: 'insensitive' };
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

      // Location match (40 points)
      if (lead.preferredLocation && foundation.region) {
        if (foundation.region.toLowerCase().includes(lead.preferredLocation.toLowerCase())) {
          score += 40;
        }
      }

      // Language match (30 points)
      if (lead.preferredLanguages && foundation.languages) {
        const matchingLanguages = lead.preferredLanguages.filter(lang =>
          foundation.languages.includes(lang),
        );
        score += (matchingLanguages.length / lead.preferredLanguages.length) * 30;
      }

      // Capacity availability (20 points)
      if (foundation.capacity && foundation.capacity > 0) {
        score += 20;
      }

      // Pedagogy match (10 points)
      if (foundation.pedagogy && foundation.pedagogy.length > 0) {
        score += 10;
      }

      return {
        ...foundation,
        matchScore: score,
      };
    });

    // Sort by match score descending
    return scoredFoundations.sort((a, b) => b.matchScore - a.matchScore);
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

    // Build the query
    const leads = await this.prisma.parentLead.findMany({
      where: {
        OR: [
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
            ...(foundation?.region || foundation?.canton
              ? {
                  preferredLocation: {
                    contains: foundation.canton || foundation.region || '',
                    mode: 'insensitive' as const,
                  },
                }
              : {}),
          },
        ],
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { parentName: { contains: filters.search, mode: 'insensitive' as const } },
                { childName: { contains: filters.search, mode: 'insensitive' as const } },
                { message: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
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
    // Verify lead exists
    const lead = await this.prisma.parentLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // Verify foundation exists
    const foundation = await this.prisma.organization.findUnique({
      where: { id: foundationId },
    });

    if (!foundation) {
      throw new NotFoundException(`Foundation with ID ${foundationId} not found`);
    }

    // Create or update the response
    const response = await this.prisma.foundationLeadResponse.upsert({
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

    // Update lead status based on response
    let newLeadStatus = lead.status;
    if (status === 'INTERESTED' || status === 'NEEDS_MORE_INFO') {
      newLeadStatus = 'PROCESSING';
    } else if (status === 'ENROLLED') {
      newLeadStatus = 'CONVERTED';
      // If enrolled, assign the lead to this foundation
      await this.prisma.parentLead.update({
        where: { id: leadId },
        data: {
          foundationId,
          status: newLeadStatus,
        },
      });
    } else if (lead.status === 'NEW') {
      newLeadStatus = 'CONTACTED';
    }

    if (newLeadStatus !== lead.status) {
      await this.prisma.parentLead.update({
        where: { id: leadId },
        data: { status: newLeadStatus },
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