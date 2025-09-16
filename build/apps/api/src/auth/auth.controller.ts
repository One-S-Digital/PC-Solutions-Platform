import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { UserRole, OrganizationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthThrottle } from '../common/decorators/throttle.decorator';

export class SignupDataDto {
  role: string;
  // Foundation fields
  organizationName?: string;
  contactPerson?: string;
  phoneNumber?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  // Product Supplier fields
  productCategory?: string;
  // Service Provider fields
  serviceType?: string;
  // Educator fields
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  // Parent fields
  childAge?: number;
  preferredLocation?: string;
  // Common fields
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('signup-data')
  @AuthThrottle()
  @ApiOperation({ summary: 'Store signup data for user creation' })
  @ApiResponse({ status: 201, description: 'Signup data stored successfully' })
  async storeSignupData(@Body() signupData: SignupDataDto) {
    // Store signup data temporarily (could use Redis or database)
    // For now, we'll return the data to be used in Clerk metadata
    return {
      success: true,
      data: signupData,
      message: 'Signup data received. Please complete registration with Clerk.',
    };
  }

  @Get('signup-fields/:role')
  @ApiOperation({ summary: 'Get required fields for a specific role' })
  @ApiResponse({ status: 200, description: 'Required fields retrieved successfully' })
  async getSignupFields(@Request() req) {
    const role = req.params.role;
    
    const fieldMappings = {
      foundation: [
        'organizationName',
        'contactPerson',
        'phoneNumber',
        'canton',
        'languages',
        'capacity',
      ],
      product_supplier: [
        'organizationName',
        'contactPerson',
        'phoneNumber',
        'canton',
        'productCategory',
      ],
      service_provider: [
        'organizationName',
        'contactPerson',
        'phoneNumber',
        'canton',
        'serviceType',
      ],
      educator: [
        'firstName',
        'lastName',
        'phoneNumber',
        'workExperience',
        'education',
        'certifications',
        'skills',
        'availability',
      ],
      parent: [
        'firstName',
        'lastName',
        'phoneNumber',
        'childAge',
        'preferredLocation',
      ],
    };

    return {
      success: true,
      data: {
        role,
        requiredFields: fieldMappings[role] || [],
      },
    };
  }

  @Post('complete-signup')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete user signup with additional data' })
  @ApiResponse({ status: 200, description: 'User signup completed successfully' })
  async completeSignup(@Request() req, @Body() additionalData: Partial<SignupDataDto>) {
    const userId = req.user.id;
    
    // Update user with additional data
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber: additionalData.phoneNumber,
        workExperience: additionalData.workExperience,
        education: additionalData.education,
        certifications: additionalData.certifications,
        skills: additionalData.skills,
        availability: additionalData.availability,
      },
    });

    // If this is an organization role, create/update organization
    if (this.isOrganizationRole(req.user.role)) {
      await this.createOrUpdateOrganization(userId, req.user.role, additionalData);
    }

    return {
      success: true,
      data: updatedUser,
      message: 'Signup completed successfully',
    };
  }

  private isOrganizationRole(role: UserRole): boolean {
    const organizationRoles: UserRole[] = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
    return organizationRoles.includes(role);
  }

  private async createOrUpdateOrganization(userId: string, role: UserRole, data: Partial<SignupDataDto>) {
    // Check if user already has an organization
    const existingOrg = await this.prisma.userOrganization.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (existingOrg) {
      // Update existing organization
      await this.prisma.organization.update({
        where: { id: existingOrg.organizationId },
        data: {
          name: data.organizationName || existingOrg.organization.name,
          contactPerson: data.contactPerson || existingOrg.organization.contactPerson,
          phoneNumber: data.phoneNumber || existingOrg.organization.phoneNumber,
          canton: data.canton || existingOrg.organization.canton,
          languages: data.languages || existingOrg.organization.languages,
          capacity: data.capacity || existingOrg.organization.capacity,
          productCategory: data.productCategory || existingOrg.organization.productCategory,
          serviceType: data.serviceType || existingOrg.organization.serviceType,
        },
      });
    } else {
      // Create new organization
      const organization = await this.prisma.organization.create({
        data: {
          name: data.organizationName || 'New Organization',
          type: this.mapUserRoleToOrganizationType(role),
          contactPerson: data.contactPerson || '',
          phoneNumber: data.phoneNumber || null,
          canton: data.canton || null,
          languages: data.languages || [],
          capacity: data.capacity || null,
          productCategory: data.productCategory || null,
          serviceType: data.serviceType || null,
        },
      });

      // Link user to organization
      await this.prisma.userOrganization.create({
        data: {
          userId,
          organizationId: organization.id,
          role: role,
        },
      });
    }
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
}