import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VendorClientReason } from '@prisma/client';

@Injectable()
export class VendorClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: {
    vendorId?: string;
    orgId?: string;
    isActive?: boolean;
    reason?: VendorClientReason;
  }) {
    const where: any = {};
    if (filters?.vendorId) where.vendorId = filters.vendorId;
    if (filters?.orgId) where.orgId = filters.orgId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.reason) where.reason = filters.reason;

    return this.prisma.vendorClient.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, type: true, isActive: true } },
        org: { select: { id: true, name: true, type: true, isActive: true } },
        markedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { markedAt: 'desc' },
    });
  }

  async upsert(params: {
    vendorId: string;
    orgId: string;
    isActive: boolean;
    reason?: VendorClientReason;
    note?: string;
    markedByUserId: string;
  }) {
    const now = new Date();
    return this.prisma.vendorClient.upsert({
      where: {
        vendorId_orgId: { vendorId: params.vendorId, orgId: params.orgId },
      },
      create: {
        vendorId: params.vendorId,
        orgId: params.orgId,
        isActive: params.isActive,
        reason: params.reason,
        note: params.note,
        markedByUserId: params.markedByUserId,
        markedAt: now,
        deactivatedAt: params.isActive ? null : now,
      },
      update: {
        isActive: params.isActive,
        reason: params.reason,
        note: params.note,
        markedByUserId: params.markedByUserId,
        markedAt: now,
        deactivatedAt: params.isActive ? null : now,
      },
      include: {
        vendor: { select: { id: true, name: true, type: true, isActive: true } },
        org: { select: { id: true, name: true, type: true, isActive: true } },
        markedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}

