import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentLeadDto } from './dto/create-parent-lead.dto';
import { UpdateParentLeadDto } from './dto/update-parent-lead.dto';
import { AppLoggerService } from '../common/logger.service';

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
}