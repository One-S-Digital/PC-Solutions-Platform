import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@workspace/types';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });
  }

  async updateUserProfile(userId: string, updateData: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  async getUserOrganizations(userId: string) {
    return this.prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });
  }

  async createOrganization(userId: string, organizationData: any, userRole: UserRole) {
    // Create organization
    const organization = await this.prisma.organization.create({
      data: organizationData
    });

    // Link user to organization
    await this.prisma.userOrganization.create({
      data: {
        userId,
        organizationId: organization.id,
        role: userRole,
      }
    });

    return organization;
  }

  async getParentLeadsForFoundation(foundationId: string) {
    return this.prisma.parentLead.findMany({
      where: { foundationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateParentLeadStatus(leadId: string, status: string) {
    return this.prisma.parentLead.update({
      where: { id: leadId },
      data: { status }
    });
  }

  async getUserRoleSpecificFields(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const baseFields = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    switch (role) {
      case UserRole.EDUCATOR:
        return {
          ...baseFields,
          workExperience: user.workExperience,
          education: user.education,
          certifications: user.certifications,
          skills: user.skills,
          availability: user.availability,
          cvUrl: user.cvUrl,
        };

      case UserRole.PARENT:
        return {
          ...baseFields,
          // Parent-specific fields would be in a separate table or extended user model
        };

      case UserRole.FOUNDATION:
      case UserRole.PRODUCT_SUPPLIER:
      case UserRole.SERVICE_PROVIDER:
        const organization = user.organizations[0]?.organization;
        return {
          ...baseFields,
          organization: organization ? {
            id: organization.id,
            name: organization.name,
            type: organization.type,
            contactPerson: organization.contactPerson,
            phoneNumber: organization.phoneNumber,
            canton: organization.canton,
            languages: organization.languages,
            capacity: organization.capacity,
            pedagogy: organization.pedagogy,
            productCategory: organization.productCategory,
            serviceType: organization.serviceType,
            minimumOrderQuantity: organization.minimumOrderQuantity,
            directOrderLink: organization.directOrderLink,
            catalogUrl: organization.catalogUrl,
            serviceCategories: organization.serviceCategories,
            deliveryType: organization.deliveryType,
            bookingLink: organization.bookingLink,
          } : null,
        };

      default:
        return baseFields;
    }
  }

  async validateRoleAccess(userId: string, requiredRole: UserRole): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return false;
    }

    // Super admin can access everything
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Admin can access most things except super admin functions
    if (user.role === UserRole.ADMIN && requiredRole !== UserRole.SUPER_ADMIN) {
      return true;
    }

    // User can only access their own role
    return user.role === requiredRole;
  }
}