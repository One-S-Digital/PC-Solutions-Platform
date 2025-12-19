import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto, UpdateInquiryDto, UpdateInquiryStatusDto } from './dto/create-inquiry.dto';
import { InquiryStatus } from '@prisma/client';

@Injectable()
export class InquiryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new inquiry from a foundation/buyer to a supplier
   */
  async createInquiry(createInquiryDto: CreateInquiryDto, buyerOrgId: string) {
    const inquiry = await this.prisma.inquiry.create({
      data: {
        ...createInquiryDto,
        organizationId: buyerOrgId,
        status: InquiryStatus.NEW,
      },
      include: {
        organization: true,
        supplier: true,
      },
    });

    return this.transformInquiry(inquiry);
  }

  /**
   * Get all inquiries for a supplier (received inquiries)
   */
  async findAllForSupplier(supplierId: string, status?: InquiryStatus) {
    const where: any = { supplierId };
    if (status) {
      where.status = status;
    }

    const inquiries = await this.prisma.inquiry.findMany({
      where,
      include: {
        organization: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return inquiries.map((inquiry) => this.transformInquiry(inquiry));
  }

  /**
   * Get all inquiries sent by a buyer organization
   */
  async findAllForBuyer(buyerOrgId: string, status?: InquiryStatus) {
    const where: any = { organizationId: buyerOrgId };
    if (status) {
      where.status = status;
    }

    const inquiries = await this.prisma.inquiry.findMany({
      where,
      include: {
        organization: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return inquiries.map((inquiry) => this.transformInquiry(inquiry));
  }

  /**
   * Get a single inquiry by ID
   */
  async findOne(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: {
        organization: true,
        supplier: true,
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return this.transformInquiry(inquiry);
  }

  /**
   * Update inquiry status (for suppliers to respond)
   */
  async updateStatus(id: string, supplierId: string, updateDto: UpdateInquiryStatusDto) {
    // Verify the inquiry belongs to this supplier
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.supplierId !== supplierId) {
      throw new ForbiddenException('You do not have permission to update this inquiry');
    }

    // Determine if this is the first response
    const isFirstResponse = !inquiry.respondedAt && 
      (updateDto.status !== 'NEW' || updateDto.responseMessage);

    const updateData: any = {
      status: updateDto.status as InquiryStatus,
    };

    if (updateDto.responseMessage !== undefined) {
      updateData.responseMessage = updateDto.responseMessage;
    }

    if (updateDto.quotedAmount !== undefined) {
      updateData.quotedAmount = updateDto.quotedAmount;
    }

    if (updateDto.supplierNotes !== undefined) {
      updateData.supplierNotes = updateDto.supplierNotes;
    }

    if (isFirstResponse) {
      updateData.respondedAt = new Date();
    }

    // Set fulfilledAt if status is FULFILLED
    if (updateDto.status === 'FULFILLED' && !inquiry.fulfilledAt) {
      updateData.fulfilledAt = new Date();
    }

    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        supplier: true,
      },
    });

    return this.transformInquiry(updated);
  }

  /**
   * Update inquiry details (notes, response, quote)
   */
  async update(id: string, supplierId: string, updateDto: UpdateInquiryDto) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.supplierId !== supplierId) {
      throw new ForbiddenException('You do not have permission to update this inquiry');
    }

    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: updateDto,
      include: {
        organization: true,
        supplier: true,
      },
    });

    return this.transformInquiry(updated);
  }

  /**
   * Get inquiry statistics for a supplier
   */
  async getSupplierStats(supplierId: string) {
    const [
      totalInquiries,
      newInquiries,
      pendingInquiries,
      fulfilledInquiries,
      recentInquiries,
    ] = await Promise.all([
      this.prisma.inquiry.count({ where: { supplierId } }),
      this.prisma.inquiry.count({ where: { supplierId, status: InquiryStatus.NEW } }),
      this.prisma.inquiry.count({ where: { supplierId, status: InquiryStatus.PENDING } }),
      this.prisma.inquiry.count({ where: { supplierId, status: InquiryStatus.FULFILLED } }),
      this.prisma.inquiry.findMany({
        where: { supplierId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          organization: true,
          supplier: true,
        },
      }),
    ]);

    // Calculate conversion rate (fulfilled / total)
    const conversionRate = totalInquiries > 0 
      ? ((fulfilledInquiries / totalInquiries) * 100).toFixed(1)
      : '0';

    return {
      totalInquiries,
      newInquiries,
      pendingInquiries,
      fulfilledInquiries,
      conversionRate: `${conversionRate}%`,
      recentInquiries: recentInquiries.map((inquiry) => this.transformInquiry(inquiry)),
    };
  }

  /**
   * Transform inquiry to frontend-friendly format
   */
  private transformInquiry(inquiry: any) {
    return {
      id: inquiry.id,
      organizationId: inquiry.organizationId,
      supplierId: inquiry.supplierId,
      
      // Inquiry details
      subject: inquiry.subject,
      message: inquiry.message,
      productInterest: inquiry.productInterest,
      quantity: inquiry.quantity,
      budget: inquiry.budget,
      urgency: inquiry.urgency,
      
      // Contact info
      contactName: inquiry.contactName,
      contactEmail: inquiry.contactEmail,
      contactPhone: inquiry.contactPhone,
      preferredContactMethod: inquiry.preferredContactMethod,
      
      // Status and response
      status: inquiry.status,
      supplierNotes: inquiry.supplierNotes,
      responseMessage: inquiry.responseMessage,
      quotedAmount: inquiry.quotedAmount,
      
      // Timestamps
      createdAt: inquiry.createdAt?.toISOString(),
      updatedAt: inquiry.updatedAt?.toISOString(),
      respondedAt: inquiry.respondedAt?.toISOString(),
      fulfilledAt: inquiry.fulfilledAt?.toISOString(),
      
      // Related entities
      buyerName: inquiry.organization?.name ?? 'Unknown',
      buyerOrgId: inquiry.organizationId,
      supplierName: inquiry.supplier?.name ?? 'Unknown',
      
      // Convenience fields for frontend
      requestDate: inquiry.createdAt?.toISOString(),
    };
  }
}
