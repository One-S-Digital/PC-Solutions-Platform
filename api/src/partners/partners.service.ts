import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto, UpdatePartnerDto, PartnerQueryDto } from './dto/partners.dto';
import { Prisma, PartnerType } from '@prisma/client';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.partner.findMany({
      where: { isActive: true },
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findFeatured() {
    return this.prisma.partner.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
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
}
