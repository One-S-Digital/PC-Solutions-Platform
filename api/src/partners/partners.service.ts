import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto, UpdatePartnerDto, PartnerQueryDto, PartnerApplicationDto } from './dto/partners.dto';
import { Prisma, PartnerType } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private prisma: PrismaService) {
    // Initialize SendGrid with API key
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (sendGridApiKey) {
      sgMail.setApiKey(sendGridApiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY not configured - email notifications will be disabled');
    }
  }

  // HTML escape utility to prevent XSS in emails
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // URL sanitization to prevent javascript: and other malicious schemes
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '#';
      }
      return url;
    } catch {
      return '#';
    }
  }

  async create(createPartnerDto: CreatePartnerDto) {
    const { partnershipStart, partnershipEnd, ...rest } = createPartnerDto;

    return this.prisma.partner.create({
      data: {
        ...rest,
        // Handle date fields: empty string or undefined = no date, value = set date
        partnershipStart: partnershipStart ? new Date(partnershipStart) : null,
        partnershipEnd: partnershipEnd ? new Date(partnershipEnd) : null,
      },
    });
  }

  async findAll(query?: PartnerQueryDto) {
    const where: Prisma.PartnerWhereInput = {};
    const andClauses: Prisma.PartnerWhereInput[] = [];

    if (query?.type) {
      andClauses.push({ type: query.type });
    }

    if (query?.isActive !== undefined) {
      andClauses.push({ isActive: query.isActive });
    }

    if (query?.isFeatured !== undefined) {
      andClauses.push({ isFeatured: query.isFeatured });
    }

    if (query?.search) {
      andClauses.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { countryRegion: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    return this.prisma.partner.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findActive() {
    try {
      return await this.prisma.partner.findMany({
        where: { isActive: true },
        orderBy: [
          { isFeatured: 'desc' },
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Error fetching active partners: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  async findFeatured() {
    try {
      return await this.prisma.partner.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
      });
    } catch (error) {
      this.logger.error(`Error fetching featured partners: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    return partner;
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto) {
    // Check if partner exists
    await this.findOne(id);

    const { partnershipStart, partnershipEnd, ...rest } = updatePartnerDto;

    return this.prisma.partner.update({
      where: { id },
      data: {
        ...rest,
        // Handle date fields: undefined = don't update, empty string = clear (null), value = set date
        partnershipStart: partnershipStart === undefined ? undefined : (partnershipStart ? new Date(partnershipStart) : null),
        partnershipEnd: partnershipEnd === undefined ? undefined : (partnershipEnd ? new Date(partnershipEnd) : null),
      },
    });
  }

  async remove(id: string) {
    // Check if partner exists
    await this.findOne(id);

    return this.prisma.partner.delete({
      where: { id },
    });
  }

  async updateDisplayOrder(id: string, displayOrder: number) {
    await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: { displayOrder },
    });
  }

  async toggleActive(id: string) {
    const partner = await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: { isActive: !partner.isActive },
    });
  }

  async toggleFeatured(id: string) {
    const partner = await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: { isFeatured: !partner.isFeatured },
    });
  }

  async getStats() {
    const [total, active, featured, byType] = await Promise.all([
      this.prisma.partner.count(),
      this.prisma.partner.count({ where: { isActive: true } }),
      this.prisma.partner.count({ where: { isFeatured: true, isActive: true } }),
      this.prisma.partner.groupBy({
        by: ['type'],
        _count: true,
        where: { isActive: true },
      }),
    ]);

    return {
      total,
      active,
      featured,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
    };
  }

  async submitApplication(applicationDto: PartnerApplicationDto) {
    const {
      organizationName,
      type,
      contactEmail,
      contactPerson,
      contactPhone,
      websiteUrl,
      countryRegion,
      message,
    } = applicationDto;

    // Create partner application record (as inactive/pending)
    const partnerApplication = await this.prisma.partner.create({
      data: {
        name: organizationName,
        type,
        contactEmail,
        contactPerson,
        contactPhone,
        websiteUrl,
        countryRegion,
        description: message,
        isActive: false, // Pending approval
        isFeatured: false,
        displayOrder: 999, // Low priority until approved
      },
    });

    // Send email notification to admin (use environment variable with fallback)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@procrechesolutions.com';
    const fromEmail = process.env.FROM_EMAIL || 'noreply@procreche.ch';

    // Escape user inputs to prevent HTML injection in emails
    const safeOrgName = this.escapeHtml(organizationName);
    const safeContactPerson = this.escapeHtml(contactPerson);
    const safeContactEmail = this.escapeHtml(contactEmail);
    const safeContactPhone = contactPhone ? this.escapeHtml(contactPhone) : '';
    const safeCountryRegion = countryRegion ? this.escapeHtml(countryRegion) : '';
    const safeWebsiteUrl = websiteUrl ? this.escapeHtml(websiteUrl) : '';
    const sanitizedWebsiteHref = websiteUrl ? this.sanitizeUrl(websiteUrl) : '';
    const safeMessage = this.escapeHtml(message).replace(/\n/g, '<br>');

    try {
      const emailContent = {
        to: adminEmail,
        from: {
          email: fromEmail,
          name: 'ProCrèche Solutions',
        },
        subject: `New Partner Application: ${safeOrgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #00B4B4; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Partner Application</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #333;">Organization Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Organization Name:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeOrgName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Partner Type:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${type}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Contact Person:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeContactPerson}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:${safeContactEmail}">${safeContactEmail}</a></td>
                </tr>
                ${contactPhone ? `<tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Phone:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeContactPhone}</td>
                </tr>` : ''}
                ${websiteUrl ? `<tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Website:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${sanitizedWebsiteHref}">${safeWebsiteUrl}</a></td>
                </tr>` : ''}
                ${countryRegion ? `<tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Country/Region:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${safeCountryRegion}</td>
                </tr>` : ''}
              </table>
              
              <h3 style="color: #333; margin-top: 20px;">Message</h3>
              <p style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                ${safeMessage}
              </p>
              
              <div style="margin-top: 20px; padding: 15px; background-color: #e8f5f5; border-radius: 5px;">
                <p style="margin: 0; color: #666;">
                  This application has been saved as a pending partner. 
                  <a href="${process.env.ADMIN_ORIGIN || 'https://admin.procreche.ch'}/partners" style="color: #00B4B4;">
                    Click here to review and approve in the admin dashboard.
                  </a>
                </p>
              </div>
            </div>
            <div style="background-color: #333; padding: 15px; text-align: center;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                ProCrèche Solutions - Partner Management System
              </p>
            </div>
          </div>
        `,
        text: `
New Partner Application

Organization: ${organizationName}
Type: ${type}
Contact Person: ${contactPerson}
Email: ${contactEmail}
${contactPhone ? `Phone: ${contactPhone}` : ''}
${websiteUrl ? `Website: ${websiteUrl}` : ''}
${countryRegion ? `Country/Region: ${countryRegion}` : ''}

Message:
${message}

This application has been saved as a pending partner. Review it in the admin dashboard.
        `,
      };

      await sgMail.send(emailContent);
      this.logger.log(`Partner application email sent to ${adminEmail} for ${organizationName}`);
    } catch (error) {
      this.logger.error(`Failed to send partner application email: ${(error as Error).message}`);
      // Don't throw - application is still saved, email failure shouldn't block the response
    }

    // Log the application for admin visibility
    // Note: In-app notifications can be added when a Notification model is implemented
    this.logger.log(`Partner application received from ${organizationName} (${contactEmail}) - ID: ${partnerApplication.id}`);

    return {
      success: true,
      message: 'Partner application submitted successfully. Our team will review your application and contact you soon.',
      applicationId: partnerApplication.id,
    };
  }
}
