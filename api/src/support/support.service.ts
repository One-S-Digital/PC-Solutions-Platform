import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupportTicketResponse } from './dto/support.dto';
import { MailgunService } from './mailgun.service';
import { EmailTemplateService } from '../email-notification/email-template.service';
import { SupportGateway } from './support.gateway';
import { UserRole } from '@prisma/client';

const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private mailgunService: MailgunService,
    private emailTemplateService: EmailTemplateService,
    @Optional() @Inject(SupportGateway) private supportGateway?: SupportGateway,
  ) {}

  /**
   * Extract storage key from a full URL or return the key if it's already a key
   */
  private extractStorageKey(fileUrl?: string): string | undefined {
    if (!fileUrl) return undefined;

    if (fileUrl.startsWith('/api/upload/download/')) {
      return fileUrl.replace('/api/upload/download/', '');
    }

    try {
      const url = new URL(fileUrl);
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch {
      return fileUrl;
    }
  }

  /**
   * Convert storage key to secure download URL
   */
  private toSecureDownloadUrl(storageKey?: string | null): string | null {
    if (!storageKey) return null;
    return `/api/upload/download/${storageKey}`;
  }

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
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentSize?: number;
      attachmentMimeType?: string;
    },
  ): Promise<SupportTicketResponse> {
    const attachmentStorageKey = this.extractStorageKey(data.attachmentUrl);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject,
        message: data.message,
        category: data.category || 'GENERAL',
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        attachmentUrl: attachmentStorageKey,
        attachmentName: data.attachmentName,
        attachmentSize: data.attachmentSize,
        attachmentMimeType: data.attachmentMimeType,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
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

    // Send email notifications (don't await - fire and forget)
    this.sendTicketCreatedEmails(ticket).catch((error) => {
      this.logger.error(`Failed to send ticket creation emails: ${error.message}`, error.stack);
      // Don't throw - email failure shouldn't block ticket creation
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
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
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

    return tickets.map((ticket) => this.transformTicket(ticket, false));
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
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
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

    return tickets.map((ticket) => this.transformTicket(ticket, true));
  }

  /**
   * Get a single ticket by ID
   */
  async getTicketById(ticketId: string, userId: string, isAdmin: boolean): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
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

    return this.transformTicket(ticket, isAdmin);
  }

  /**
   * Add a response to a ticket
   */
  async addResponse(
    ticketId: string,
    userId: string,
    message: string,
    isStaff: boolean,
    attachment?: {
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentSize?: number;
      attachmentMimeType?: string;
    },
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

    const attachmentStorageKey = this.extractStorageKey(attachment?.attachmentUrl);

    // Create the response
    const response = await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        userId,
        message,
        isStaff,
        attachmentUrl: attachmentStorageKey,
        attachmentName: attachment?.attachmentName,
        attachmentSize: attachment?.attachmentSize,
        attachmentMimeType: attachment?.attachmentMimeType,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Update ticket status if staff is responding
    if (isStaff && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Get updated ticket for WebSocket emission
    const updatedTicket = await this.getTicketById(ticketId, userId, isStaff);

    // Emit WebSocket event for real-time updates
    if (this.supportGateway) {
      const replyData = {
        id: response.id,
        message: response.message,
        isStaff: response.isStaff,
        createdAt: response.createdAt.toISOString(),
        userName: response.user
          ? `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown',
      };
      this.supportGateway.emitReplyCreated(ticketId, replyData);
      this.supportGateway.emitTicketUpdated(ticketId, updatedTicket);
    }

    // Return updated ticket
    return updatedTicket;
  }

  /**
   * Update ticket status (admin only)
   */
  async updateTicketStatus(
    ticketId: string,
    status: string,
    adminUserId: string,
  ): Promise<SupportTicketResponse> {
    // Validate status
    if (!ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      throw new BadRequestException(`Invalid status: ${status}. Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const updateData: { status: string; resolvedAt?: Date } = { status };

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
   * Get all admin email addresses for support notifications
   */
  private async getAdminEmails(): Promise<string[]> {
    const admins = await this.prisma.appUser.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        email: {
          not: null,
        },
      },
      select: {
        email: true,
      },
    });

    return admins
      .map(admin => admin.email)
      .filter((email): email is string => email !== null);
  }

  /**
   * Send emails when a ticket is created
   */
  private async sendTicketCreatedEmails(ticket: any): Promise<void> {
    const user = ticket.user;
    if (!user || !user.email) {
      this.logger.warn(`Cannot send ticket confirmation email - user email not found for ticket ${ticket.id}`);
      return;
    }

    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const ticketUrl = `${process.env.FRONTEND_URL || 'https://platform.com'}/support/tickets/${ticket.id}`;
    const adminTicketUrl = `${process.env.ADMIN_URL || 'https://admin.platform.com'}/support?ticket=${ticket.id}`;

    // Priority labels for email
    const priorityLabels: Record<string, string> = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      URGENT: 'Urgent',
    };

    const categoryLabels: Record<string, string> = {
      GENERAL: 'General',
      TECHNICAL: 'Technical Support',
      BILLING: 'Billing',
      FEATURE_REQUEST: 'Feature Request',
    };

    // 1. Send confirmation email to ticket creator via Mailgun
    try {
      if (!this.mailgunService.isConfigured()) {
        this.logger.warn('Mailgun not configured - skipping support ticket emails');
        return;
      }

      const customerTemplate = await this.emailTemplateService.getTemplate('support_ticket_created');
      if (!customerTemplate) {
        this.logger.warn('Support ticket created template not found - skipping customer email');
      } else {
        const payload = {
          firstName: user.firstName || 'User',
          lastName: user.lastName || '',
          ticketId: ticket.id,
          ticketSubject: ticket.subject,
          ticketMessage: ticket.message,
          ticketCategory: categoryLabels[ticket.category] || ticket.category,
          ticketPriority: priorityLabels[ticket.priority] || ticket.priority,
          ticketUrl: ticketUrl,
          createdAt: new Date(ticket.createdAt).toLocaleString(),
        };

        const subject = this.processTemplate(customerTemplate.subject, payload);
        const html = this.processTemplate(customerTemplate.htmlContent, payload);
        const text = this.processTemplate(customerTemplate.textContent, payload);

        const result = await this.mailgunService.sendEmail({
          to: user.email,
          subject,
          html,
          text,
          tags: ['support_ticket_created'],
          variables: {
            userId: user.id,
            ticketId: ticket.id,
            event: 'support_ticket_created',
          },
        });

        if (result.success) {
          this.logger.log(`Ticket confirmation email sent to ${user.email} for ticket ${ticket.id}`);
        } else {
          this.logger.error(`Failed to send confirmation email: ${result.error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${user.email}: ${(error as Error).message}`);
    }

    // 2. Send notification email to all admins
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found - support team notification not sent');
        return;
      }

      // Determine if urgent and set template variables accordingly
      const isUrgent = ticket.priority === 'URGENT' || ticket.priority === 'HIGH';
      const urgencyPrefix = isUrgent ? '🚨 URGENT: ' : '';
      const headerTitle = isUrgent ? '🚨 URGENT' : 'New Support Ticket';
      const headerColor = isUrgent ? '#f44336' : '#2196F3';
      const borderColor = isUrgent ? '#f44336' : '#2196F3';
      const urgentNotice = isUrgent
        ? '<p class="urgent-notice">⚠️ This ticket is marked as URGENT and requires immediate attention.</p>'
        : '';

      // Get admin notification template
      const adminTemplate = await this.emailTemplateService.getTemplate('support_ticket_notification');
      if (!adminTemplate) {
        this.logger.warn('Support ticket notification template not found - skipping admin emails');
        return;
      }

      // Send to each admin individually via Mailgun
      const emailPromises = adminEmails.map(async (adminEmail) => {
        const payload = {
          ticketId: ticket.id,
          ticketSubject: ticket.subject,
          ticketMessage: ticket.message,
          ticketCategory: categoryLabels[ticket.category] || ticket.category,
          ticketPriority: ticket.priority, // Use raw value for CSS class
          customerName: userName,
          customerEmail: user.email,
          ticketUrl: adminTicketUrl,
          createdAt: new Date(ticket.createdAt).toLocaleString(),
          urgencyPrefix,
          headerTitle,
          headerColor,
          borderColor,
          urgentNotice,
        };

        const subject = this.processTemplate(adminTemplate.subject, payload);
        const html = this.processTemplate(adminTemplate.htmlContent, payload);
        const text = this.processTemplate(adminTemplate.textContent, payload);

        return this.mailgunService.sendEmail({
          to: adminEmail,
          subject,
          html,
          text,
          tags: ['support_ticket_notification', ticket.priority],
          variables: {
            ticketId: ticket.id,
            event: 'support_ticket_notification',
            priority: ticket.priority,
          },
        });
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      this.logger.log(`Support team notification emails sent to ${successCount}/${adminEmails.length} admins for ticket ${ticket.id}`);
    } catch (error) {
      this.logger.error(`Failed to send support team notification emails: ${(error as Error).message}`);
    }
  }

  /**
   * Process template with payload variables
   */
  private processTemplate(template: string, payload: any): string {
    let processed = template;
    Object.keys(payload).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, payload[key] || '');
    });
    return processed;
  }

  /**
   * Transform database ticket to response format
   */
  private transformTicket(ticket: any, isAdmin = false): SupportTicketResponse {
    return {
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      attachmentUrl: isAdmin ? this.toSecureDownloadUrl(ticket.attachmentUrl) : null,
      attachmentName: isAdmin ? ticket.attachmentName || null : null,
      attachmentSize: isAdmin ? ticket.attachmentSize ?? null : null,
      attachmentMimeType: isAdmin ? ticket.attachmentMimeType || null : null,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      assignedTo: ticket.assignedTo || null,
      assignee: ticket.assignee
        ? {
            id: ticket.assignee.id,
            firstName: ticket.assignee.firstName,
            lastName: ticket.assignee.lastName,
            email: ticket.assignee.email,
          }
        : null,
      user: ticket.user
        ? {
            id: ticket.user.id,
            firstName: ticket.user.firstName,
            lastName: ticket.user.lastName,
            email: ticket.user.email,
          }
        : undefined,
      responses: (ticket.responses || []).map((r: any) => ({
        id: r.id,
        message: r.message,
        isStaff: r.isStaff,
        createdAt: r.createdAt.toISOString(),
        attachmentUrl: isAdmin ? this.toSecureDownloadUrl(r.attachmentUrl) : null,
        attachmentName: isAdmin ? r.attachmentName || null : null,
        attachmentSize: isAdmin ? r.attachmentSize ?? null : null,
        attachmentMimeType: isAdmin ? r.attachmentMimeType || null : null,
        userName: r.user
          ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown',
      })),
    };
  }
}
