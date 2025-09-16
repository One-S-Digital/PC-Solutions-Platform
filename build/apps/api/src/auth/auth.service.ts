import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, OrganizationType, ClerkUser } from '@repo/types';
import { ClerkAuthService } from './clerk-auth.service';

// Re-export ClerkUser for compatibility
export type { ClerkUser } from '@repo/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly clerkAuthService: ClerkAuthService,
  ) {}

  async validateClerkToken(token: string): Promise<ClerkUser> {
    try {
      // Use the secure ClerkAuthService to verify the token
      const verifiedPayload = await this.clerkAuthService.verifyToken(token);
      
      // Get user from database using the verified Clerk user ID
      const user = await this.prisma.user.findUnique({
        where: { clerkId: verifiedPayload.sub },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Get the primary organization for the user
      const primaryOrg = user.organizations.find(org => org.role === user.role);

      return {
        id: user.id,
        email: user.email,
        emailAddresses: [{ emailAddress: user.email, id: user.id }],
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        organizationId: primaryOrg?.organizationId,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      };
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }

  async getUserByClerkId(clerkId: string): Promise<ClerkUser | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Get the primary organization for the user
      const primaryOrg = user.organizations.find(org => org.role === user.role);

      return {
        id: user.id,
        email: user.email,
        emailAddresses: [{ emailAddress: user.email, id: user.id }],
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        organizationId: primaryOrg?.organizationId,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      };
    } catch (error) {
      return null;
    }
  }

  async syncUserFromClerk(clerkUser: any): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    const role = this.mapClerkRoleToUserRole(clerkUser.public_metadata?.role);

    if (!existingUser) {
      // Create new user
      await this.prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.email_addresses[0]?.email_address || '',
          firstName: clerkUser.first_name || '',
          lastName: clerkUser.last_name || '',
          role: role,
          phoneNumber: clerkUser.public_metadata?.phoneNumber || null,
        },
      });

      // If this is an organization role, create the organization
      if (this.isOrganizationRole(role)) {
        await this.createOrganizationForUser(clerkUser, role);
      }
    } else {
      // Update existing user
      await this.prisma.user.update({
        where: { clerkId: clerkUser.id },
        data: {
          email: clerkUser.email_addresses[0]?.email_address || existingUser.email,
          firstName: clerkUser.first_name || existingUser.firstName,
          lastName: clerkUser.last_name || existingUser.lastName,
          role: role || existingUser.role,
          phoneNumber: clerkUser.public_metadata?.phoneNumber || existingUser.phoneNumber,
        },
      });
    }
  }

  private async createOrganizationForUser(clerkUser: any, role: UserRole): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) return;

    const organizationData = {
      name: clerkUser.public_metadata?.organizationName || `${user.firstName} ${user.lastName}`,
      type: this.mapUserRoleToOrganizationType(role),
      contactPerson: `${user.firstName} ${user.lastName}`,
      phoneNumber: clerkUser.public_metadata?.phoneNumber || null,
      canton: clerkUser.public_metadata?.canton || null,
      languages: clerkUser.public_metadata?.languages || [],
      capacity: clerkUser.public_metadata?.capacity || null,
      pedagogy: clerkUser.public_metadata?.pedagogy || [],
      productCategory: clerkUser.public_metadata?.productCategory || null,
      serviceType: clerkUser.public_metadata?.serviceType || null,
      minimumOrderQuantity: clerkUser.public_metadata?.minimumOrderQuantity || null,
      directOrderLink: clerkUser.public_metadata?.directOrderLink || null,
      catalogUrl: clerkUser.public_metadata?.catalogUrl || null,
      serviceCategories: clerkUser.public_metadata?.serviceCategories || [],
      deliveryType: clerkUser.public_metadata?.deliveryType || null,
      bookingLink: clerkUser.public_metadata?.bookingLink || null,
    };

    const organization = await this.prisma.organization.create({
      data: organizationData,
    });

    // Link user to organization
    await this.prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: role,
      },
    });
  }

  private isOrganizationRole(role: UserRole): boolean {
    const organizationRoles: UserRole[] = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
    return organizationRoles.includes(role);
  }

  private mapUserRoleToOrganizationType(role: UserRole): OrganizationType {
    const roleMap: Record<UserRole, OrganizationType> = {
      [UserRole.FOUNDATION]: OrganizationType.FOUNDATION,
      [UserRole.PRODUCT_SUPPLIER]: OrganizationType.PRODUCT_SUPPLIER,
      [UserRole.SERVICE_PROVIDER]: OrganizationType.SERVICE_PROVIDER,
      [UserRole.SUPER_ADMIN]: OrganizationType.FOUNDATION, // Default for admin users
      [UserRole.ADMIN]: OrganizationType.FOUNDATION, // Default for admin users
      [UserRole.EDUCATOR]: OrganizationType.FOUNDATION, // Not applicable
      [UserRole.PARENT]: OrganizationType.FOUNDATION, // Not applicable
    };

    return roleMap[role] || OrganizationType.FOUNDATION;
  }

  private mapClerkRoleToUserRole(clerkRole: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'super_admin': UserRole.SUPER_ADMIN,
      'admin': UserRole.ADMIN,
      'foundation': UserRole.FOUNDATION,
      'product_supplier': UserRole.PRODUCT_SUPPLIER,
      'service_provider': UserRole.SERVICE_PROVIDER,
      'educator': UserRole.EDUCATOR,
      'parent': UserRole.PARENT,
    };

    return roleMap[clerkRole] || UserRole.PARENT;
  }
}