import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface UserContext {
  profile: string;
  state: string;
}

@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string, role: UserRole, organizationId?: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, approvalStatus: true },
    });

    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
    const approval =
      role === UserRole.EDUCATOR && user?.approvalStatus
        ? ` | Approval: ${user.approvalStatus}`
        : '';
    const profile = `${name} | Role: ${role}${organizationId ? ` | Org: ${organizationId}` : ''}${approval}`;

    const state = await this.buildState(role, userId, organizationId).catch(() => '');

    return { profile, state: state || 'No activity data available.' };
  }

  private async buildState(role: UserRole, userId: string, orgId?: string): Promise<string> {
    const lines: string[] = [];

    switch (role) {
      case UserRole.FOUNDATION: {
        if (!orgId) break;
        const [newLeads, activeJobs, pendingOrders] = await Promise.all([
          this.prisma.parentLead.count({ where: { foundationId: orgId, status: 'NEW' } }),
          this.prisma.jobListing.count({ where: { foundationId: orgId, status: 'PUBLISHED' } }),
          this.prisma.order.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        ]);
        lines.push(`New parent leads: ${newLeads}`);
        lines.push(`Active job listings: ${activeJobs}`);
        lines.push(`Pending orders: ${pendingOrders}`);
        break;
      }

      case UserRole.EDUCATOR: {
        const [total, pending, shortlisted] = await Promise.all([
          this.prisma.jobApplication.count({ where: { candidateId: userId } }),
          this.prisma.jobApplication.count({ where: { candidateId: userId, status: 'PENDING' } }),
          this.prisma.jobApplication.count({ where: { candidateId: userId, status: 'SHORTLISTED' } }),
        ]);
        lines.push(`Total applications: ${total}`);
        lines.push(`Pending: ${pending} | Shortlisted: ${shortlisted}`);
        break;
      }

      case UserRole.PARENT: {
        const [total, responded] = await Promise.all([
          this.prisma.parentLead.count({ where: { parentUserId: userId } }),
          this.prisma.parentLead.count({ where: { parentUserId: userId, status: 'RESPONDED' } }),
        ]);
        lines.push(`Submitted enquiries: ${total}`);
        lines.push(`Responded: ${responded}`);
        break;
      }

      case UserRole.PRODUCT_SUPPLIER: {
        if (!orgId) break;
        const [products, pendingOrders] = await Promise.all([
          this.prisma.product.count({ where: { supplierId: orgId } }),
          this.prisma.order.count({
            where: {
              status: 'PENDING',
              items: { some: { product: { supplierId: orgId } } },
            },
          }),
        ]);
        lines.push(`Total products: ${products}`);
        lines.push(`Pending orders: ${pendingOrders}`);
        break;
      }

      case UserRole.SERVICE_PROVIDER: {
        if (!orgId) break;
        const sp = await this.prisma.serviceProvider.findFirst({
          where: { organizationId: orgId },
          select: { id: true },
        });
        if (sp) {
          const [pending, total] = await Promise.all([
            this.prisma.serviceRequest.count({ where: { service: { providerId: sp.id }, status: 'PENDING' } }),
            this.prisma.service.count({ where: { providerId: sp.id } }),
          ]);
          lines.push(`Services listed: ${total}`);
          lines.push(`Pending requests: ${pending}`);
        }
        break;
      }

      default:
        break;
    }

    return lines.join('\n');
  }
}
