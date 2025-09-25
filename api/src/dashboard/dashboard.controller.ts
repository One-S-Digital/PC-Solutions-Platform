import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards()
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('foundation/stats')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getFoundationStats(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Calculate real stats from database
    const [
      totalJobListings,
      totalApplications,
      totalOrders,
      totalServiceRequests,
      activeJobListings,
      pendingApplications
    ] = await Promise.all([
      this.prisma.jobListing.count({
        where: { foundationId: { in: organizationIds } }
      }),
      this.prisma.jobApplication.count({
        where: {
          jobListing: {
            foundationId: { in: organizationIds }
          }
        }
      }),
      this.prisma.order.count({
        where: { organizationId: { in: organizationIds } }
      }),
      this.prisma.serviceRequest.count({
        where: { organizationId: { in: organizationIds } }
      }),
      this.prisma.jobListing.count({
        where: { 
          foundationId: { in: organizationIds },
          status: 'PUBLISHED'
        }
      }),
      this.prisma.jobApplication.count({
        where: {
          jobListing: {
            foundationId: { in: organizationIds }
          },
          status: 'PENDING'
        }
      })
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
      activeJobListings
    };

    return {
      success: true,
      data: stats
    };
  }

  @Get('foundation/activities')
  @Roles(UserRole.FOUNDATION)
  @ApiOperation({ summary: 'Get foundation recent activities' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getFoundationActivities(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Get real activities from database
    const [
      recentApplications,
      recentOrders,
      recentServiceRequests,
      recentJobListings
    ] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: {
          jobListing: {
            foundationId: { in: organizationIds }
          }
        },
        include: {
          candidate: true,
          jobListing: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.order.findMany({
        where: { organizationId: { in: organizationIds } },
        include: {
          organization: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.serviceRequest.findMany({
        where: { organizationId: { in: organizationIds } },
        include: {
          organization: true,
          service: {
            include: {
              provider: {
                include: {
                  organization: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.jobListing.findMany({
        where: { foundationId: { in: organizationIds } },
        include: {
          foundation: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // Transform data into activity format
    const activities = [
      ...recentApplications.map(app => ({
        id: app.id,
        type: 'application',
        title: 'New Job Application',
        description: `${app.candidate.firstName} ${app.candidate.lastName} applied for ${app.jobListing.title}`,
        timestamp: app.createdAt.toISOString(),
        status: app.status.toLowerCase()
      })),
      ...recentOrders.map(order => ({
        id: order.id,
        type: 'order',
        title: 'New Order',
        description: `Order for ${order.items.length} items totaling CHF ${order.totalAmount}`,
        timestamp: order.createdAt.toISOString(),
        status: order.status.toLowerCase()
      })),
      ...recentServiceRequests.map(req => ({
        id: req.id,
        type: 'service',
        title: 'Service Request',
        description: `Request for ${req.service.title} from ${req.service.provider.organization.name}`,
        timestamp: req.createdAt.toISOString(),
        status: req.status.toLowerCase()
      })),
      ...recentJobListings.map(job => ({
        id: job.id,
        type: 'job',
        title: 'Job Listing Created',
        description: `Posted new job: ${job.title}`,
        timestamp: job.createdAt.toISOString(),
        status: job.status.toLowerCase()
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    return {
      success: true,
      data: activities
    };
  }

  @Get('educator/stats')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Get educator dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getEducatorStats(@Request() req) {
    const userId = req.context.userId;
    
    // Calculate real stats from database
    const [
      applicationsSent,
      interviewsScheduled,
      jobOffers,
      profileViews,
      skillsCompleted,
      certificationsExpiring
    ] = await Promise.all([
      this.prisma.jobApplication.count({
        where: { candidateId: userId }
      }),
      this.prisma.jobApplication.count({
        where: { 
          candidateId: userId,
          status: 'REVIEWED' // Assuming this means interview scheduled
        }
      }),
      this.prisma.jobApplication.count({
        where: { 
          candidateId: userId,
          status: 'ACCEPTED'
        }
      }),
      0, // Profile views would need a separate tracking system
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true }
      }).then(user => user?.skills?.length || 0),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { certifications: true }
      }).then(user => user?.certifications?.length || 0)
    ]);

    const stats = {
      applicationsSent,
      interviewsScheduled,
      jobOffers,
      profileViews,
      skillsCompleted,
      certificationsExpiring
    };

    return {
      success: true,
      data: stats
    };
  }

  @Get('educator/jobs')
  @Roles(UserRole.EDUCATOR)
  @ApiOperation({ summary: 'Get educator job opportunities' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getEducatorJobs(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's applications to determine status
    const userApplications = await this.prisma.jobApplication.findMany({
      where: { candidateId: userId },
      select: { jobListingId: true, status: true }
    });
    
    const applicationMap = new Map(
      userApplications.map(app => [app.jobListingId, app.status])
    );

    // Get recent job listings with application status
    const jobs = await this.prisma.jobListing.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        foundation: true,
        applications: {
          where: { candidateId: userId },
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const jobData = jobs.map(job => ({
      id: job.id,
      title: job.title,
      organization: job.foundation.name,
      location: job.location || 'Not specified',
      salary: job.salary || 'Not specified',
      type: 'full-time', // This would need to be added to the schema
      postedDate: job.createdAt.toISOString(),
      status: job.applications.length > 0 ? job.applications[0].status.toLowerCase() : 'not_applied'
    }));

    return {
      success: true,
      data: jobData
    };
  }

  @Get('supplier/stats')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getSupplierStats(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Calculate real stats from database
    const [
      totalOrders,
      monthlyRevenue,
      activeCustomers,
      pendingOrders,
      inventoryItems,
      lowStockItems
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                supplierId: { in: organizationIds }
              }
            }
          }
        }
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: {
            supplierId: { in: organizationIds }
          },
          order: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        select: {
          price: true,
          quantity: true
        }
      }).then(items => items.reduce((sum, item) => sum + (item.price * item.quantity), 0)),
      this.prisma.order.groupBy({
        by: ['organizationId'],
        where: {
          items: {
            some: {
              product: {
                supplierId: { in: organizationIds }
              }
            }
          }
        }
      }).then(result => result.length),
      this.prisma.order.count({
        where: {
          status: 'PENDING',
          items: {
            some: {
              product: {
                supplierId: { in: organizationIds }
              }
            }
          }
        }
      }),
      this.prisma.product.count({
        where: { supplierId: { in: organizationIds } }
      }),
      0 // Low stock would need inventory tracking
    ]);

    const stats = {
      totalOrders,
      monthlyRevenue,
      activeCustomers,
      pendingOrders,
      inventoryItems,
      lowStockItems
    };

    return {
      success: true,
      data: stats
    };
  }

  @Get('supplier/orders')
  @Roles(UserRole.PRODUCT_SUPPLIER)
  @ApiOperation({ summary: 'Get supplier recent orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getSupplierOrders(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Get real orders from database
    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              supplierId: { in: organizationIds }
            }
          }
        }
      },
      include: {
        organization: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const orderData = orders.map(order => {
      const supplierItems = order.items.filter(item => 
        organizationIds.includes(item.product.supplierId)
      );
      
      return {
        id: order.id,
        customerName: order.organization.name,
        productName: supplierItems.length === 1 
          ? supplierItems[0].product.title 
          : `${supplierItems.length} products`,
        quantity: supplierItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: supplierItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        orderDate: order.createdAt.toISOString(),
        status: order.status.toLowerCase()
      };
    });

    return {
      success: true,
      data: orderData
    };
  }

  @Get('service-provider/stats')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getServiceProviderStats(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Calculate real stats from database
    const [
      totalBookings,
      monthlyRevenue,
      activeClients,
      pendingBookings,
      completedServices
    ] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: {
          service: {
            provider: {
              organizationId: { in: organizationIds }
            }
          }
        }
      }),
      this.prisma.serviceRequest.aggregate({
        where: {
          service: {
            provider: {
              organizationId: { in: organizationIds }
            }
          },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _count: {
          id: true
        }
      }).then(result => result._count.id * 100), // Placeholder calculation
      this.prisma.serviceRequest.groupBy({
        by: ['organizationId'],
        where: {
          service: {
            provider: {
              organizationId: { in: organizationIds }
            }
          }
        }
      }).then(result => result.length),
      this.prisma.serviceRequest.count({
        where: {
          status: 'PENDING',
          service: {
            provider: {
              organizationId: { in: organizationIds }
            }
          }
        }
      }),
      this.prisma.serviceRequest.count({
        where: {
          status: 'COMPLETED',
          service: {
            provider: {
              organizationId: { in: organizationIds }
            }
          }
        }
      })
    ]);

    const stats = {
      totalBookings,
      monthlyRevenue,
      activeClients,
      pendingBookings,
      completedServices,
      averageRating: 0 // Would need rating system
    };

    return {
      success: true,
      data: stats
    };
  }

  @Get('service-provider/bookings')
  @Roles(UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get service provider recent bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getServiceProviderBookings(@Request() req) {
    const userId = req.context.userId;
    
    // Get user's organizations
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true }
    });

    const organizationIds = userOrganizations.map(uo => uo.organizationId);

    // Get real bookings from database
    const bookings = await this.prisma.serviceRequest.findMany({
      where: {
        service: {
          provider: {
            organizationId: { in: organizationIds }
          }
        }
      },
      include: {
        organization: true,
        service: {
          include: {
            provider: {
              include: {
                organization: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const bookingData = bookings.map(booking => ({
      id: booking.id,
      clientName: booking.organization.name,
      serviceType: booking.service.title,
      scheduledDate: booking.scheduledAt?.toISOString() || booking.createdAt.toISOString(),
      duration: 0, // Would need duration field
      totalAmount: booking.service.price || 0,
      status: booking.status.toLowerCase()
    }));

    return {
      success: true,
      data: bookingData
    };
  }

  @Get('parent/stats')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent dashboard stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getParentStats(@Request() req) {
    const userId = req.context.userId;
    
    // Calculate real stats from database
    const [
      applicationsSent,
      interviewsScheduled,
      offersReceived,
      messagesUnread
    ] = await Promise.all([
      this.prisma.parentLead.count({
        where: { 
          parentEmail: req.user.email // Assuming parent email matches user email
        }
      }),
      0, // Would need interview scheduling system
      0, // Would need offer tracking system
      this.prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false
        }
      })
    ]);

    const stats = {
      applicationsSent,
      interviewsScheduled,
      offersReceived,
      favoritesCount: 0, // Would need favorites system
      messagesUnread,
      childAge: 0 // Would need child profile system
    };

    return {
      success: true,
      data: stats
    };
  }

  @Get('parent/options')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get parent childcare options' })
  @ApiResponse({ status: 200, description: 'Options retrieved successfully' })
  async getParentOptions(@Request() req) {
    // Get real childcare options from database
    const foundations = await this.prisma.organization.findMany({
      where: { type: 'FOUNDATION' },
      include: {
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const options = foundations.map(foundation => ({
      id: foundation.id,
      name: foundation.name,
      type: 'foundation',
      location: foundation.region || 'Not specified',
      rating: 0, // Would need rating system
      price: 0, // Would need pricing system
      availability: 'Available', // Would need availability tracking
      status: 'not_applied' // Would need application tracking
    }));

    return {
      success: true,
      data: options
    };
  }
}