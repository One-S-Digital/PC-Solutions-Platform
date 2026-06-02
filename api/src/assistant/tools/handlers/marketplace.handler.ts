import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  isAdminRole,
  resolveLimit,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/** Supplier / foundation marketplace reads: orders, listings, service requests. */
@Injectable()
export class MarketplaceReadHandler implements ToolHandler {
  readonly toolNames = ['get_my_orders', 'get_my_listings', 'get_my_service_requests'];

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);
    const adminRole = isAdminRole(principal.role);

    if (toolName === 'get_my_orders') {
      const where: Record<string, unknown> = {};
      if (principal.role === UserRole.PRODUCT_SUPPLIER && principal.organizationId) {
        where.items = { some: { product: { supplierId: principal.organizationId } } };
      } else if (principal.organizationId) {
        where.organizationId = principal.organizationId;
      } else if (!adminRole) {
        return { data: { orders: [] }, total: 0 };
      }
      if (args.status) where.status = args.status;
      const orders = await this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, totalAmount: true, status: true, createdAt: true },
      });
      return {
        data: { orders },
        total: orders.length,
        scope: !principal.organizationId ? 'platform-wide' : 'organization',
      };
    }

    if (toolName === 'get_my_listings') {
      if (principal.role === UserRole.PRODUCT_SUPPLIER) {
        if (!principal.organizationId) return { data: { listings: [] }, total: 0 };
        const products = await this.prisma.product.findMany({
          where: { supplierId: principal.organizationId },
          take: limit,
          select: { id: true, title: true, price: true, status: true, isActive: true },
        });
        return { data: { listings: products, type: 'products' }, total: products.length };
      }
      if (principal.role === UserRole.SERVICE_PROVIDER) {
        if (!principal.organizationId) return { data: { listings: [] }, total: 0 };
        const sp = await this.prisma.serviceProvider.findFirst({
          where: { organizationId: principal.organizationId },
          select: { id: true },
        });
        if (!sp) return { data: { listings: [], type: 'services' }, total: 0 };
        const services = await this.prisma.service.findMany({
          where: { providerId: sp.id },
          take: limit,
          select: { id: true, title: true, price: true, isActive: true, category: true },
        });
        return { data: { listings: services, type: 'services' }, total: services.length };
      }
      if (adminRole) {
        const [products, services] = await Promise.all([
          this.prisma.product.findMany({
            take: Math.ceil(limit / 2),
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, price: true, status: true, isActive: true },
          }),
          this.prisma.service.findMany({
            take: Math.floor(limit / 2),
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, price: true, isActive: true, category: true },
          }),
        ]);
        return {
          data: { listings: [...products, ...services], type: 'all' },
          total: products.length + services.length,
          scope: 'platform-wide',
        };
      }
      return { data: { listings: [] }, total: 0 };
    }

    // get_my_service_requests
    if (adminRole && !principal.organizationId) {
      const where: Record<string, unknown> = {};
      if (args.status) where.status = args.status;
      const requests = await this.prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          status: true,
          description: true,
          scheduledAt: true,
          requestedAt: true,
          service: { select: { title: true } },
        },
      });
      return { data: { requests }, total: requests.length, scope: 'platform-wide' };
    }
    if (!principal.organizationId) return { data: { requests: [] }, total: 0 };
    const sp = await this.prisma.serviceProvider.findFirst({
      where: { organizationId: principal.organizationId },
      select: { id: true },
    });
    if (!sp) return { data: { requests: [] }, total: 0 };
    const where: Record<string, unknown> = { service: { providerId: sp.id } };
    if (args.status) where.status = args.status;
    const requests = await this.prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        description: true,
        scheduledAt: true,
        requestedAt: true,
        service: { select: { title: true } },
      },
    });
    return { data: { requests }, total: requests.length };
  }
}
