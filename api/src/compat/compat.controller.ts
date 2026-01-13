import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Prisma, UserRole, JobStatus, JobContractType, OrganizationType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateJobListingDto } from '../recruitment/dto/create-job-listing.dto';

type RequestUser = {
  role?: UserRole;
  organizationId?: string;
  orgId?: string;
};

type RequestWithUser = {
  user?: RequestUser;
};

@Controller('compat')
@UseGuards(RolesGuard)
export class CompatController {
  constructor(private prisma: PrismaService) {}

  private mapCompatJobStatusToDb(status?: string | null): JobStatus | undefined {
    if (!status) return undefined;
    const normalized = status.toUpperCase();
    // Compat/admin UI historically used ACTIVE/PAUSED/CLOSED.
    if (normalized === 'ACTIVE') return JobStatus.PUBLISHED;
    if (normalized === 'PAUSED') return JobStatus.DRAFT;
    if (normalized === 'CLOSED') return JobStatus.CLOSED;
    // Newer UI may send DB statuses directly.
    if (normalized in JobStatus) return (JobStatus as any)[normalized] as JobStatus;
    return undefined;
  }

  private marketplaceActiveSubscriptionWhere(now: Date): Prisma.SubscriptionWhereInput {
    return {
      OR: [
        {
          status: SubscriptionStatus.ACTIVE,
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
        },
        {
          status: SubscriptionStatus.TRIAL,
          OR: [{ trialEnd: null }, { trialEnd: { gt: now } }],
        },
        {
          status: SubscriptionStatus.GRACE_PERIOD,
          OR: [{ gracePeriodEnd: null }, { gracePeriodEnd: { gt: now } }],
        },
      ],
    };
  }

  /**
   * Build the marketplace visibility condition for organizations.
   * An organization is visible if it has an active subscription linked EITHER:
   * 1. Directly to the organization (via organizationId), OR
   * 2. Through a member user (via userId -> UserOrganization -> User -> Subscription)
   * 
   * This handles both new subscriptions (with organizationId) and legacy subscriptions
   * (with only userId).
   */
  private marketplaceVisibilityWhere(now: Date): Prisma.OrganizationWhereInput {
    const activeSubCondition = this.marketplaceActiveSubscriptionWhere(now);
    
    return {
      OR: [
        // Option 1: Direct subscription linked to organization
        {
          subscriptions: {
            some: activeSubCondition,
          },
        },
        // Option 2: Subscription linked through a member user
        {
          members: {
            some: {
              user: {
                mainSubscriptions: {
                  some: activeSubCondition,
                },
              },
            },
          },
        },
      ],
    };
  }

  private canBypassMarketplaceSubscriptionGate(user: RequestUser | undefined, organizationId: string): boolean {
    const role = user?.role;
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return true;

    // Different parts of the app use different shapes for "current org"
    const userOrgId = user?.organizationId || user?.orgId;
    return Boolean(userOrgId && userOrgId === organizationId);
  }

  @Get('products')
  @Public()
  async getProducts() {
    try {
      const products = await this.prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: products, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('services')
  @Public()
  async getServices() {
    try {
      const services = await this.prisma.service.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: services, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('job-listings')
  @Public()
  async getJobListings() {
    try {
      const jobs = await this.prisma.jobListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          foundation: true,
          _count: {
            select: { applications: true },
          },
        },
      });
      
      // Transform to include organization name and applicant count
      const formattedJobs = jobs.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary || job.salaryRange,
        type: job.contractType,
        status: job.status,
        organizationName: job.foundation?.name || 'Unknown Organization',
        foundationId: job.foundationId,
        applicants: job._count.applications,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        qualifications: job.qualifications,
        benefits: job.benefits,
        createdAt: job.createdAt.toISOString(),
      }));
      
      return { success: true, message: 'OK', data: formattedJobs, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('job-listings')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION)
  async createJobListing(@Body() createJobListingDto: CreateJobListingDto) {
    try {
      const job = await this.prisma.jobListing.create({
        data: {
          title: createJobListingDto.title,
          description: createJobListingDto.description,
          location: createJobListingDto.location,
          salary: createJobListingDto.salary,
          contractType: createJobListingDto.contractType || JobContractType.FULL_TIME,
          foundationId: createJobListingDto.foundationId,
          requirements: createJobListingDto.requirements || [],
          responsibilities: createJobListingDto.responsibilities || [],
          qualifications: createJobListingDto.qualifications || [],
          benefits: createJobListingDto.benefits || [],
          status: this.mapCompatJobStatusToDb(createJobListingDto.status as any) || JobStatus.DRAFT,
          publishedAt: this.mapCompatJobStatusToDb(createJobListingDto.status as any) === JobStatus.PUBLISHED ? new Date() : null,
        },
        include: {
          foundation: true,
        },
      });
      
      const formattedJob = {
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary,
        type: job.contractType,
        status: job.status,
        organizationName: job.foundation?.name || 'Unknown Organization',
        foundationId: job.foundationId,
        applicants: 0,
        createdAt: job.createdAt.toISOString(),
      };
      
      return { success: true, message: 'Job listing created successfully', data: formattedJob, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create job listing', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Patch('job-listings/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION)
  async updateJobListing(@Param('id') id: string, @Body() updateData: any) {
    try {
      const mappedStatus = this.mapCompatJobStatusToDb(updateData?.status);
      const job = await this.prisma.jobListing.update({
        where: { id },
        data: {
          ...(updateData?.title !== undefined && { title: updateData.title }),
          ...(updateData?.description !== undefined && { description: updateData.description }),
          ...(updateData?.location !== undefined && { location: updateData.location }),
          ...(updateData?.salary !== undefined && { salary: updateData.salary }),
          ...(updateData?.contractType !== undefined && { contractType: updateData.contractType }),
          ...(Array.isArray(updateData?.requirements) && { requirements: updateData.requirements }),
          ...(Array.isArray(updateData?.responsibilities) && { responsibilities: updateData.responsibilities }),
          ...(Array.isArray(updateData?.qualifications) && { qualifications: updateData.qualifications }),
          ...(Array.isArray(updateData?.benefits) && { benefits: updateData.benefits }),
          ...(mappedStatus
            ? {
                status: mappedStatus,
                publishedAt: mappedStatus === JobStatus.PUBLISHED ? new Date() : null,
              }
            : {}),
        },
        include: { foundation: true },
      });

      return {
        success: true,
        message: 'Job listing updated successfully',
        data: {
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          salary: job.salary,
          type: job.contractType,
          status: job.status,
          organizationName: job.foundation?.name || 'Unknown Organization',
          foundationId: job.foundationId,
          createdAt: job.createdAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, message: 'Failed to update job listing', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Delete('job-listings/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FOUNDATION)
  async deleteJobListing(@Param('id') id: string) {
    try {
      await this.prisma.jobListing.delete({ where: { id } });
      return { success: true, message: 'Job listing deleted successfully', timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to delete job listing', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('orders')
  @Public()
  async getOrders() {
    try {
      const orders = await this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          organization: true,
          items: {
            include: {
              product: {
                include: {
                  supplier: true,
                  imageAsset: true,
                },
              },
            },
          },
        },
      });

      // Transform orders to include supplierId and supplierName at root level for frontend compatibility
      const transformedOrders = orders.map((order) => {
        const firstItem = order.items[0];
        const supplier = firstItem?.product?.supplier;

        return {
          ...order,
          supplierId: supplier?.id ?? null,
          supplierName: supplier?.name ?? null,
          foundationOrgId: order.organizationId,
          foundationId: order.organizationId,
          requestDate: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            productId: item.productId,
            productName: item.product?.title ?? 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.price,
            imageUrl: item.product?.imageAsset?.publicUrl ?? null,
          })),
        };
      });

      return { success: true, message: 'OK', data: transformedOrders, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('order-requests')
  @Public()
  async getOrderRequests() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('candidates')
  @Public()
  async getCandidates() {
    try {
      const candidates = await this.prisma.user.findMany({
        where: { role: UserRole.EDUCATOR },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          avatarAsset: true,
        },
      });

      const clerkIds = candidates.map((u) => u.clerkId).filter(Boolean);
      const appUsers = clerkIds.length
        ? await this.prisma.appUser.findMany({
            where: { clerkId: { in: clerkIds } },
            select: { id: true, clerkId: true },
          })
        : [];
      const appUserByClerkId = new Map(appUsers.map((u) => [u.clerkId, u]));
      
      // Transform to candidate format
      const formattedCandidates = candidates.map(user => ({
        id: appUserByClerkId.get(user.clerkId)?.id ?? user.id,
        profileId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        email: user.email,
        phone: user.phoneNumber,
        currentRoleOrTitle: 'Educator',
        role: user.role,
        experience: user.workExperience,
        availabilityStatus: user.availability || 'Available',
        skills: user.skills,
        certifications: user.certifications,
        shortBio: user.shortBio,
        candidatePoolVisible: user.candidatePoolVisible,
        createdAt: user.createdAt.toISOString(),
        user: {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          email: user.email,
        },
      }));
      
      return { success: true, message: 'OK', data: formattedCandidates, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('candidates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createCandidate(@Body() createCandidateDto: CreateCandidateDto) {
    try {
      // Check if email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createCandidateDto.email },
      });
      if (existingUser) {
        return {
          success: false,
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString(),
        };
      }

      // Generate a temporary clerkId for admin-created candidates
      const tempClerkId = `admin_created_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const candidate = await this.prisma.user.create({
        data: {
          clerkId: tempClerkId,
          email: createCandidateDto.email,
          firstName: createCandidateDto.firstName,
          lastName: createCandidateDto.lastName,
          phoneNumber: createCandidateDto.phoneNumber,
          skills: createCandidateDto.skills || [],
          certifications: createCandidateDto.certifications || [],
          workExperience: createCandidateDto.workExperience,
          education: createCandidateDto.education,
          availability: createCandidateDto.availability,
          shortBio: createCandidateDto.shortBio,
          role: UserRole.EDUCATOR,
        },
      });
      
      const formattedCandidate = {
        id: candidate.id,
        name: [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || candidate.email,
        email: candidate.email,
        phone: candidate.phoneNumber,
        currentRoleOrTitle: 'Educator',
        role: candidate.role,
        experience: candidate.workExperience,
        availabilityStatus: candidate.availability || 'Available',
        skills: candidate.skills,
        certifications: candidate.certifications,
        shortBio: candidate.shortBio,
        createdAt: candidate.createdAt.toISOString(),
      };
      
      return { success: true, message: 'Candidate created successfully', data: formattedCandidate, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create candidate', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('policy-documents')
  @Public()
  async getPolicyDocuments() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('policy-alerts')
  @Public()
  async getPolicyAlerts() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('users')
  @Public()
  async getUsers() {
    try {
      const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: users, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('organizations')
  @Public()
  async getOrganizations(
    @Query('type') type?: string,
    @Query('region') region?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const where: any = {};
      
      // Filter by organization type
      if (type) {
        const orgType = this.mapToOrganizationType(type);
        where.type = orgType;

        // Marketplace visibility gate:
        // if requesting suppliers or service providers, only return orgs with an active subscription.
        // This checks BOTH direct org subscriptions AND subscriptions through member users.
        if (
          orgType === OrganizationType.PRODUCT_SUPPLIER ||
          orgType === OrganizationType.SERVICE_PROVIDER
        ) {
          const now = new Date();
          const visibilityCondition = this.marketplaceVisibilityWhere(now);
          // Merge the visibility OR conditions into the where clause
          where.AND = [
            ...(where.AND || []),
            visibilityCondition,
          ];
        }
      }
      
      // Filter by region
      if (region && region !== 'All') {
        where.OR = [
          { region: region },
          { canton: region },
          { regionsServed: { has: region } },
        ];
      }
      
      // Filter by active status
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }
      
      // Search filter
      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
      }
      
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '100', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [orgs, total] = await Promise.all([
        this.prisma.organization.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limitNum,
          skip,
          include: {
            logoAsset: true,
            coverAsset: true,
            products: {
              where: { isActive: true },
              take: 5,
              select: {
                id: true,
                title: true,
                category: true,
                categories: true,
                price: true,
                imageAsset: true,
              },
            },
            serviceProviders: {
              include: {
                services: {
                  where: { isActive: true },
                  take: 5,
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    categories: true,
                    price: true,
                    priceInfo: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.organization.count({ where }),
      ]);
      
      // Transform organizations to include legacy fields
      const transformedOrgs = orgs.map(org => ({
        ...org,
        logoUrl: org.logoAsset?.publicUrl,
        coverImageUrl: org.coverAsset?.publicUrl,
        // Transform products with imageUrl
        products: org.products?.map(p => ({
          ...p,
          imageUrl: p.imageAsset?.publicUrl,
        })) || [],
        // Flatten services from serviceProviders for convenience
        services: org.serviceProviders?.flatMap(sp => sp.services) || [],
      }));
      
      return {
        success: true,
        message: 'OK',
        data: {
          organizations: transformedOrgs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('organizations/:id')
  @Public()
  async getOrganizationById(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const now = new Date();
      const activeSubWhere = this.marketplaceActiveSubscriptionWhere(now);
      
      const org = await this.prisma.organization.findUnique({
        where: { id },
        include: {
          logoAsset: true,
          coverAsset: true,
          products: {
            where: { isActive: true },
            include: {
              imageAsset: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          serviceProviders: {
            include: {
              services: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          // Include organization members with user details for messaging functionality.
          // Ordered by creation date ascending; the first member (oldest) is assumed
          // to be the primary contact for the organization.
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  // Include user's subscriptions to check for user-based subscriptions
                  mainSubscriptions: {
                    where: activeSubWhere,
                    select: { id: true },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          // Direct organization subscriptions
          subscriptions: {
            where: activeSubWhere,
            select: { id: true },
          },
        },
      });
      if (!org) {
        return { success: false, message: 'Organization not found', timestamp: new Date().toISOString() };
      }

      // Check if org has valid subscription either directly or through a member user
      const hasDirectSubscription = org.subscriptions && org.subscriptions.length > 0;
      const hasUserSubscription = org.members?.some(
        member => member.user?.mainSubscriptions && member.user.mainSubscriptions.length > 0
      );
      const hasValidSubscription = hasDirectSubscription || hasUserSubscription;

      // Marketplace visibility gate for vendor profiles (supplier/service provider).
      // Vendors without an active subscription should not appear as marketplace profiles.
      // Allow bypass for admins and members of the organization.
      if (
        (org.type === OrganizationType.PRODUCT_SUPPLIER ||
          org.type === OrganizationType.SERVICE_PROVIDER) &&
        !this.canBypassMarketplaceSubscriptionGate(req?.user, org.id)
      ) {
        if (!hasValidSubscription) {
          return { success: false, message: 'Organization not found', timestamp: new Date().toISOString() };
        }
      }
      
      // Transform to include legacy fields
      const transformedOrg = {
        ...org,
        logoUrl: org.logoAsset?.publicUrl,
        coverImageUrl: org.coverAsset?.publicUrl,
        // Flatten services from serviceProviders
        services: org.serviceProviders?.flatMap(sp => sp.services) || [],
        // Transform products with imageUrl
        products: org.products?.map(p => ({
          ...p,
          imageUrl: p.imageAsset?.publicUrl,
        })) || [],
      };
      
      return { success: true, message: 'OK', data: transformedOrg, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Post('organizations')
  @Public()
  async createOrganization(@Body() data: any) {
    try {
      // Map type string to OrganizationType enum
      const orgType = this.mapToOrganizationType(data.type);
      
      const org = await this.prisma.organization.create({
        data: {
          name: data.name,
          type: orgType,
          description: data.description,
          region: data.region,
          phoneNumber: data.phone,
          canton: data.region, // Map region to canton as well
          languages: data.languagesSpoken || [],
          capacity: data.capacity,
          pedagogy: data.pedagogy || [],
          contactPerson: data.contactPerson,
          websiteUrl: data.websiteUrl ?? data.website,
          directOrderLink: data.directOrderLink,
          catalogUrl: data.catalogUrl,
          serviceCategories: data.serviceCategories || [],
          deliveryType: data.deliveryType,
          bookingLink: data.bookingLink,
        },
      });
      return { success: true, message: 'Organization created successfully', data: org, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Put('organizations/:id')
  @Public()
  async updateOrganization(@Param('id') id: string, @Body() data: any) {
    try {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = this.mapToOrganizationType(data.type);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.region !== undefined) {
        updateData.region = data.region;
        updateData.canton = data.region;
      }
      if (data.phone !== undefined) updateData.phoneNumber = data.phone;
      if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
      if (data.languagesSpoken !== undefined) updateData.languages = data.languagesSpoken;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.pedagogy !== undefined) updateData.pedagogy = data.pedagogy;
      if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
      if (data.website !== undefined) updateData.websiteUrl = data.website;
      if (data.catalogUrl !== undefined) updateData.catalogUrl = data.catalogUrl;
      if (data.directOrderLink !== undefined) updateData.directOrderLink = data.directOrderLink;
      if (data.serviceCategories !== undefined) updateData.serviceCategories = data.serviceCategories;
      if (data.deliveryType !== undefined) updateData.deliveryType = data.deliveryType;
      if (data.bookingLink !== undefined) updateData.bookingLink = data.bookingLink;

      const org = await this.prisma.organization.update({
        where: { id },
        data: updateData,
      });
      return { success: true, message: 'Organization updated successfully', data: org, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to update organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Delete('organizations/:id')
  @Public()
  async deleteOrganization(@Param('id') id: string) {
    try {
      // First check if organization exists
      const org = await this.prisma.organization.findUnique({ where: { id } });
      if (!org) {
        return { success: false, message: 'Organization not found', timestamp: new Date().toISOString() };
      }

      // Delete the organization (cascades should handle related records)
      await this.prisma.organization.delete({ where: { id } });
      return { success: true, message: 'Organization deleted successfully', timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to delete organization', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  private mapToOrganizationType(type: string): OrganizationType {
    switch (type?.toUpperCase()) {
      case 'FOUNDATION':
        return OrganizationType.FOUNDATION;
      case 'SERVICE_PROVIDER':
        return OrganizationType.SERVICE_PROVIDER;
      case 'PRODUCT_SUPPLIER':
        return OrganizationType.PRODUCT_SUPPLIER;
      default:
        console.warn(`Unknown organization type: ${type}, defaulting to FOUNDATION`);
        return OrganizationType.FOUNDATION;
    }
  }

  @Get('parent-leads')
  @Public()
  async getParentLeads() {
    try {
      const leads = await this.prisma.parentLead.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
      return { success: true, message: 'OK', data: leads, timestamp: new Date().toISOString() };
    } catch (error) {
      // If table missing, return empty silently to avoid 500 in admin
      return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
    }
  }

  @Post('parent-leads')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT)
  async createParentLead(@Body() data: any) {
    try {
      const lead = await this.prisma.parentLead.create({
        data: {
          ...data,
          submissionDate: new Date(),
        },
      });
      return { success: true, message: 'Lead created successfully', data: lead, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, message: 'Failed to create lead', error: String((error as Error).message || error), timestamp: new Date().toISOString() };
    }
  }

  @Get('messages/conversations')
  @Public()
  async getConversations() {
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Get('vendor-clients')
  @Roles(UserRole.FOUNDATION)
  async getVendorClients() {
    // Return empty vendor clients list - this is a placeholder for future implementation
    // Vendor clients would track which suppliers/service providers a foundation works with
    return { success: true, message: 'OK', data: [], timestamp: new Date().toISOString() };
  }

  @Post('vendor-clients')
  @Roles(UserRole.FOUNDATION)
  async updateVendorClient(@Body() data: { vendorId: string; orgId: string; isActive: boolean; reason?: string; note?: string }) {
    // Placeholder for vendor client management
    // In a full implementation, this would store foundation-vendor relationships
    return { 
      success: true, 
      message: 'Vendor client updated', 
      data: {
        id: `vc-${Date.now()}`,
        vendorId: data.vendorId,
        orgId: data.orgId,
        isActive: data.isActive,
        reason: data.reason,
        note: data.note,
        markedAt: new Date().toISOString(),
      }, 
      timestamp: new Date().toISOString() 
    };
  }
}

