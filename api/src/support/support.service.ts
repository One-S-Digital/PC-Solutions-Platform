import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { SupportTicketResponse } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    data: {
      subject: string;
      message: string;
      category?: string;
      priority?: string;
    },
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject,
        message: data.message,
        category: data.category || 'GENERAL',
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
      },
      include: {
        responses: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.transformTicket(ticket);
  }

  /**
   * Get all tickets for a user
   */
  async getUserTickets(userId: string): Promise<SupportTicketResponse[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        responses: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(this.transformTicket);
  }

  /**
   * Get all tickets (admin only)
   */
  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }): Promise<SupportTicketResponse[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        responses: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(this.transformTicket);
  }

  /**
   * Get a single ticket by ID
   */
  async getTicketById(ticketId: string, userId: string, isAdmin: boolean): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        responses: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Check authorization
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return this.transformTicket(ticket);
  }

  /**
   * Add a response to a ticket
   */
  async addResponse(
    ticketId: string,
    userId: string,
    message: string,
    isStaff: boolean,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Check authorization for non-staff
    if (!isStaff && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Create the response
    await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        userId,
        message,
        isStaff,
      },
    });

    // Update ticket status if staff is responding
    if (isStaff && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Return updated ticket
    return this.getTicketById(ticketId, userId, isStaff);
  }

  /**
   * Update ticket status (admin only)
   */
  async updateTicketStatus(
    ticketId: string,
    status: string,
    adminUserId: string,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const updateData: any = { status };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    return this.getTicketById(ticketId, adminUserId, true);
  }

  /**
   * Assign ticket to admin (admin only)
   */
  async assignTicket(
    ticketId: string,
    assigneeId: string,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: assigneeId,
        status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
      },
    });

    return this.getTicketById(ticketId, assigneeId, true);
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats() {
    const [total, byStatus, byPriority, byCategory] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of byStatus) {
      statusCounts[item.status] = item._count.id;
    }

    const priorityCounts: Record<string, number> = {};
    for (const item of byPriority) {
      priorityCounts[item.priority] = item._count.id;
    }

    const categoryCounts: Record<string, number> = {};
    for (const item of byCategory) {
      categoryCounts[item.category] = item._count.id;
    }

    return {
      total,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      byCategory: categoryCounts,
      open: statusCounts['OPEN'] || 0,
      inProgress: statusCounts['IN_PROGRESS'] || 0,
      resolved: statusCounts['RESOLVED'] || 0,
      closed: statusCounts['CLOSED'] || 0,
    };
  }

  /**
   * Transform database ticket to response format
   */
  private transformTicket(ticket: any): SupportTicketResponse {
    return {
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      responses: (ticket.responses || []).map((r: any) => ({
        id: r.id,
        message: r.message,
        isStaff: r.isStaff,
        createdAt: r.createdAt.toISOString(),
        userName: r.user
          ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown',
      })),
    };
  }
}
