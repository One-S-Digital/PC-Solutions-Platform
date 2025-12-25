import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { wrapResponse } from '../common/utils/response.util';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get user's organization IDs
   */
  private async getUserOrganizationIds(userId: string): Promise<string[]> {
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return userOrganizations.map((uo) => uo.organizationId);
  }

  // ============================================
  // FOUNDATION ENDPOINTS
  // ============================================

  @Get('foundation/quick-stats')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation quick stats for dashboard' })
  @ApiResponse({ status: 200, description: 'Quick stats retrieved successfully' })
  async getFoundationQuickStats(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const stats = await this.dashboardService.getFoundationQuickStats(organizationIds);
    return wrapResponse(stats);
  }

  @Get('foundation/activities')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation recent activities' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getFoundationActivities(@Request() req, @Query('limit') limit?: string) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    // Validate and bound the limit parameter
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;
    const activities = await this.dashboardService.getFoundationActivities(
      organizationIds,
      safeLimit,
    );
    return wrapResponse(activities);
  }

  @Get('foundation/calendar')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation calendar events for a specific date' })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved successfully' })
  async getFoundationCalendar(@Request() req, @Query('date') date?: string) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const events = await this.dashboardService.getFoundationCalendarEvents(organizationIds, date);
    return wrapResponse(events);
  }

  @Post('foundation/calendar')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Create a calendar event' })
  @ApiResponse({ status: 201, description: 'Calendar event created successfully' })
  async createCalendarEvent(
    @Request() req,
    @Body()
    body: {
      title: string;
      description?: string;
      eventType: string;
      startTime: string;
      endTime?: string;
      allDay?: boolean;
      location?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return {
        success: false,
        message: 'User has no associated organization',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }

    const event = await this.dashboardService.createCalendarEvent(
      organizationIds[0], // Use primary organization
      userId,
      {
        title: body.title,
        description: body.description,
        eventType: body.eventType,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        allDay: body.allDay,
        location: body.location,
        relatedEntityType: body.relatedEntityType,
        relatedEntityId: body.relatedEntityId,
      },
    );

    return wrapResponse(event, 'Calendar event created');
  }

  @Delete('foundation/calendar/:eventId')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Delete a calendar event' })
  @ApiResponse({ status: 200, description: 'Calendar event deleted successfully' })
  async deleteCalendarEvent(@Request() req, @Param('eventId') eventId: string) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const deleted = await this.dashboardService.deleteCalendarEvent(eventId, organizationIds);

    if (!deleted) {
      return {
        success: false,
        message: 'Event not found or not authorized',
        data: null,
        timestamp: new Date().toISOString(),
      };
    }

    return wrapResponse({ deleted: true }, 'Calendar event deleted');
  }

  @Get('foundation/weather')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get weather data for foundation location' })
  @ApiResponse({ status: 200, description: 'Weather data retrieved successfully' })
  async getFoundationWeather(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const weather = await this.dashboardService.getFoundationWeather(organizationIds);
    return wrapResponse(weather);
  }

  @Get('foundation/stats')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation dashboard stats (legacy)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getFoundationStats(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    // Helper to safely execute queries that might fail due to missing tables
    const safeQuery = async <T>(query: Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query;
      } catch (error: unknown) {
        // Handle case where table doesn't exist (P2021)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
          console.warn('Table does not exist, returning default value');
          return defaultValue;
        }
        throw error;
      }
    };

    // Calculate real stats from database
    const [
      totalJobListings,
      totalApplications,
      totalOrders,
      totalServiceRequests,
      activeJobListings,
      pendingApplications,
    ] = await Promise.all([
      this.prisma.jobListing.count({
        where: { foundationId: { in: organizationIds } },
      }),
      this.prisma.jobApplication.count({
        where: {
          jobListing: { foundationId: { in: organizationIds } },
        },
      }),
      safeQuery(
        this.prisma.order.count({
          where: { organizationId: { in: organizationIds } },
        }),
        0,
      ),
      safeQuery(
        this.prisma.serviceRequest.count({
          where: { organizationId: { in: organizationIds } },
        }),
        0,
      ),
      this.prisma.jobListing.count({
        where: {
          foundationId: { in: organizationIds },
          status: 'PUBLISHED',
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          jobListing: { foundationId: { in: organizationIds } },
          status: 'PENDING',
        },
      }),
    ]);

    const stats = {
      totalChildren: 0, // This would need a separate children management system
      activeEducators: 0, // This would need employee management
      pendingApplications,
      upcomingEvents: 0, // This would need event management
      monthlyRevenue: 0, // This would need payment tracking
      occupancyRate: 0, // This would need capacity management
      totalJobListings,
      totalApplications,
      totalOrders,
      totalServiceRequests,
      activeJobListings,
    };

    return wrapResponse(stats);
  }

  // ============================================
  // EDUCATOR ENDPOINTS
  // ============================================

  @Get('educator/stats')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Get educator dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getEducatorStats(@Request() req) {
    const userId = req.context.userId;

    const [applicationsSent, interviewsScheduled, jobOffers, user] = await Promise.all([
      this.prisma.jobApplication.count({
        where: { candidateId: userId },
      }),
      this.prisma.jobApplication.count({
        where: {
          candidateId: userId,
          status: 'REVIEWED',
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          candidateId: userId,
          status: 'ACCEPTED',
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true, certifications: true },
      }),
    ]);

    const stats = {
      applicationsSent,
      interviewsScheduled,
      jobOffers,
      profileViews: 0,
      skillsCompleted: user?.skills?.length || 0,
      certificationsExpiring: user?.certifications?.length || 0,
    };

    return wrapResponse(stats);
  }

  @Get('educator/jobs')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Get educator job opportunities' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getEducatorJobs(@Request() req) {
    const userId = req.context.userId;

    const jobs = await this.prisma.jobListing.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        foundation: true,
        applications: {
          where: { candidateId: userId },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const jobData = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      organization: job.foundation.name,
      location: job.location || 'Not specified',
      salary: job.salary || 'Not specified',
      type: job.contractType || 'full-time',
      postedDate: job.createdAt.toISOString(),
      status: job.applications.length > 0 ? job.applications[0].status.toLowerCase() : 'not_applied',
    }));

    return wrapResponse(jobData);
  }

  // ============================================
  // SUPPLIER ENDPOINTS
  // ============================================

  @Get('supplier/stats')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getSupplierStats(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    // Helper to safely execute queries that might fail due to missing tables
    const safeQuery = async <T>(query: Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query;
      } catch (error: unknown) {
        // Handle case where table doesn't exist (P2021)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
          console.warn('Table does not exist, returning default value');
          return defaultValue;
        }
        throw error;
      }
    };

    const [
      totalOrders,
      revenueThisMonth,
      activeCustomers,
      pendingOrders,
      inventoryItems,
      fulfilledOrders,
    ] = await Promise.all([
      safeQuery(
        this.prisma.order.count({
          where: {
            items: {
              some: { product: { supplierId: { in: organizationIds } } },
            },
          },
        }),
        0,
      ),
      safeQuery(
        this.prisma.orderItem
          .findMany({
            where: {
              product: { supplierId: { in: organizationIds } },
              order: {
                status: { in: ['FULFILLED', 'COMPLETED', 'DELIVERED'] },
                createdAt: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
              },
            },
            select: { price: true, quantity: true },
          })
          .then((items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
        0,
      ),
      safeQuery(
        this.prisma.order
          .groupBy({
            by: ['organizationId'],
            where: {
              items: {
                some: { product: { supplierId: { in: organizationIds } } },
              },
            },
          })
          .then((result) => result.length),
        0,
      ),
      safeQuery(
        this.prisma.order.count({
          where: {
            status: { in: ['PENDING', 'SUBMITTED'] },
            items: {
              some: { product: { supplierId: { in: organizationIds } } },
            },
          },
        }),
        0,
      ),
      this.prisma.product.count({
        where: { supplierId: { in: organizationIds } },
      }),
      safeQuery(
        this.prisma.order.count({
          where: {
            status: { in: ['FULFILLED', 'COMPLETED', 'DELIVERED'] },
            items: {
              some: { product: { supplierId: { in: organizationIds } } },
            },
          },
        }),
        0,
      ),
    ]);

    // Calculate fulfillment rate (default to 0 when no orders, not 100)
    const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;

    const stats = {
      totalOrders,
      revenueThisMonth,
      monthlyRevenue: revenueThisMonth, // Alias for backward compatibility
      activeCustomers,
      pendingOrders,
      inventoryItems,
      lowStockItems: 0,
      fulfillmentRate,
    };

    return wrapResponse(stats);
  }

  @Get('supplier/orders')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier recent orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getSupplierOrders(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    // Note: orders table may not exist in all environments
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          items: {
            some: { product: { supplierId: { in: organizationIds } } },
          },
        },
        include: {
          organization: true,
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const orderData = orders.map((order) => {
        const supplierItems = order.items.filter((item) =>
          organizationIds.includes(item.product.supplierId),
        );

        return {
          id: order.id,
          customerName: order.organization.name,
          productName:
            supplierItems.length === 1
              ? supplierItems[0].product.title
              : `${supplierItems.length} products`,
          quantity: supplierItems.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: supplierItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          orderDate: order.createdAt.toISOString(),
          status: order.status.toLowerCase(),
        };
      });

      return wrapResponse(orderData);
    } catch (error: unknown) {
      // Handle case where orders table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('Order table does not exist, returning empty orders list');
        return wrapResponse([]);
      }
      throw error;
    }
  }

  // ============================================
  // SERVICE PROVIDER ENDPOINTS
  // ============================================

  @Get('service-provider/stats')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getServiceProviderStats(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Helper to safely execute queries that might fail due to missing tables
    const safeQuery = async <T>(query: Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query;
      } catch (error: unknown) {
        // Handle case where table doesn't exist (P2021)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
          console.warn('Table does not exist, returning default value');
          return defaultValue;
        }
        throw error;
      }
    };

    const [
      totalBookings,
      activeClients,
      pendingBookings,
      completedServices,
      upcomingAppointments,
      services,
      monthlyRevenue,
    ] = await Promise.all([
      safeQuery(
        this.prisma.serviceRequest.count({
          where: {
            service: { provider: { organizationId: { in: organizationIds } } },
          },
        }),
        0,
      ),
      safeQuery(
        this.prisma.serviceRequest
          .groupBy({
            by: ['organizationId'],
            where: {
              service: { provider: { organizationId: { in: organizationIds } } },
            },
          })
          .then((result) => result.length),
        0,
      ),
      safeQuery(
        this.prisma.serviceRequest.count({
          where: {
            status: { in: ['PENDING', 'NEW', 'IN_REVIEW'] },
            service: { provider: { organizationId: { in: organizationIds } } },
          },
        }),
        0,
      ),
      safeQuery(
        this.prisma.serviceRequest.count({
          where: {
            status: 'COMPLETED',
            service: { provider: { organizationId: { in: organizationIds } } },
          },
        }),
        0,
      ),
      // Count upcoming appointments (scheduled in the next 7 days)
      safeQuery(
        this.prisma.serviceRequest.count({
          where: {
            service: { provider: { organizationId: { in: organizationIds } } },
            scheduledAt: {
              gte: now,
              lte: sevenDaysFromNow,
            },
            status: { in: ['PENDING', 'CONFIRMED', 'SCHEDULED', 'ACCEPTED'] },
          },
        }),
        0,
      ),
      // Get all services for this provider
      this.prisma.service.findMany({
        where: {
          provider: { organizationId: { in: organizationIds } },
        },
        select: {
          id: true,
          category: true,
          categories: true,
          isActive: true,
          price: true,
        },
      }),
      // Calculate monthly revenue from completed services
      safeQuery(
        this.prisma.serviceRequest
          .findMany({
            where: {
              service: { provider: { organizationId: { in: organizationIds } } },
              status: 'COMPLETED',
              updatedAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            include: {
              service: { select: { price: true } },
            },
          })
          .then((requests) =>
            requests.reduce((sum, req) => sum + (req.service?.price || 0), 0),
          ),
        0,
      ),
    ]);

    // Calculate service management stats
    const activeServices = services.filter((s) => s.isActive).length;
    const totalServices = services.length;

    // Extract unique categories
    const categoriesSet = new Set<string>();
    services.forEach((s) => {
      if (s.category) categoriesSet.add(s.category);
      s.categories?.forEach((cat) => categoriesSet.add(cat));
    });

    const stats = {
      // Overview stats
      activeRequests: pendingBookings,
      completedServices,
      upcomingAppointments,
      customerRating: 0, // TODO: Implement rating system
      // Service management stats
      totalServices,
      activeServices,
      pendingApproval: 0, // Services don't have approval workflow currently
      categories: Array.from(categoriesSet),
      // Legacy stats for compatibility
      totalBookings,
      monthlyRevenue,
      activeClients,
      pendingBookings,
      averageRating: 0,
    };

    return wrapResponse(stats);
  }

  @Get('service-provider/bookings')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider recent bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getServiceProviderBookings(
    @Request() req,
    @Query('upcoming') upcoming?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const now = new Date();

    // Build where clause based on query params
    const whereClause: any = {
      service: { provider: { organizationId: { in: organizationIds } } },
    };

    // If upcoming=true, only return future scheduled appointments
    if (upcoming === 'true') {
      whereClause.scheduledAt = { gte: now };
      whereClause.status = { in: ['PENDING', 'CONFIRMED', 'SCHEDULED', 'ACCEPTED'] };
    }

    // Validate and bound the limit parameter to prevent NaN and excessive queries
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;

    try {
      const bookings = await this.prisma.serviceRequest.findMany({
        where: whereClause,
        include: {
          organization: true,
          service: {
            include: { provider: { include: { organization: true } } },
          },
        },
        orderBy: upcoming === 'true' ? { scheduledAt: 'asc' } : { createdAt: 'desc' },
        take: safeLimit,
      });

      const bookingData = bookings.map((booking) => ({
        id: booking.id,
        clientName: booking.organization.name,
        clientOrgId: booking.organization.id,
        serviceId: booking.serviceId,
        serviceType: booking.service.title,
        serviceTitle: booking.service.title,
        description: booking.description,
        scheduledDate: booking.scheduledAt?.toISOString() || null,
        requestedDate: booking.requestedAt?.toISOString() || booking.createdAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        duration: 0,
        totalAmount: booking.service.price || 0,
        status: booking.status.toLowerCase(),
      }));

      return wrapResponse(bookingData);
    } catch (error: unknown) {
      // Handle case where service_requests table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('Service requests table does not exist, returning empty bookings list');
        return wrapResponse([]);
      }
      throw error;
    }
  }

  // ============================================
  // PARENT ENDPOINTS
  // ============================================

  @Get('parent/stats')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getParentStats(@Request() req) {
    const userId = req.context.userId;

    // Helper to safely execute queries that might fail due to missing tables
    const safeCount = async (query: Promise<number>): Promise<number> => {
      try {
        return await query;
      } catch (error: unknown) {
        // Handle case where table doesn't exist (P2021)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
          console.warn('Table does not exist, returning 0 for count');
          return 0;
        }
        throw error;
      }
    };

    const [user, messagesUnread] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      safeCount(
        this.prisma.message.count({
          where: {
            receiverId: userId,
            isRead: false,
          },
        }),
      ),
    ]);

    // Get leads submitted by this parent
    const applicationsSent = await this.prisma.parentLead.count({
      where: { parentEmail: user?.email || '' },
    });

    const stats = {
      applicationsSent,
      interviewsScheduled: 0,
      offersReceived: 0,
      favoritesCount: 0,
      messagesUnread,
      childAge: 0,
    };

    return wrapResponse(stats);
  }

  @Get('parent/options')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent childcare options' })
  @ApiResponse({ status: 200, description: 'Options retrieved successfully' })
  async getParentOptions() {
    const foundations = await this.prisma.organization.findMany({
      where: { type: 'FOUNDATION', isActive: true },
      include: {
        members: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const options = foundations.map((foundation) => ({
      id: foundation.id,
      name: foundation.name,
      type: 'foundation',
      location: foundation.region || foundation.canton || 'Not specified',
      rating: 0,
      price: 0,
      availability: 'Available',
      status: 'not_applied',
    }));

    return wrapResponse(options);
  }
}
