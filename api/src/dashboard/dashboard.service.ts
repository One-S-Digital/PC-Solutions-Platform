import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FoundationQuickStats {
  enrolled: number;
  capacity: number;
  availableSpots: number;
  pendingApplications: number;
  upcomingAppointments: number;
  newLeads: number;
  trend: {
    enrolled: number;
    leads: number;
  };
}

export interface FoundationActivity {
  id: string;
  type: 'lead' | 'application' | 'order' | 'service' | 'message' | 'job';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  location?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  location: string;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get quick stats for foundation dashboard
   */
  async getFoundationQuickStats(organizationIds: string[]): Promise<FoundationQuickStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get organization capacity
    const organizations = await this.prisma.organization.findMany({
      where: { id: { in: organizationIds } },
      select: { capacity: true },
    });
    const totalCapacity = organizations.reduce((sum, org) => sum + (org.capacity || 0), 0);

    // Get lead counts (enrolled leads count as "enrolled children" for now)
    const [enrolledCount, newLeadsCount, previousEnrolledCount, previousLeadsCount] = await Promise.all([
      // Current enrolled (leads with ENROLLED status from this foundation)
      this.prisma.foundationLeadResponse.count({
        where: {
          foundationId: { in: organizationIds },
          status: 'ENROLLED',
        },
      }),
      // New leads in last 30 days
      this.prisma.parentLead.count({
        where: {
          status: 'NEW',
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { foundationId: { in: organizationIds } },
            { foundationId: null }, // Unassigned leads
          ],
        },
      }),
      // Previous period enrolled (for trend)
      this.prisma.foundationLeadResponse.count({
        where: {
          foundationId: { in: organizationIds },
          status: 'ENROLLED',
          respondedAt: { lt: thirtyDaysAgo },
        },
      }),
      // Previous period leads
      this.prisma.parentLead.count({
        where: {
          createdAt: {
            gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
            lt: thirtyDaysAgo,
          },
        },
      }),
    ]);

    // Get pending job applications
    const pendingApplications = await this.prisma.jobApplication.count({
      where: {
        jobListing: { foundationId: { in: organizationIds } },
        status: 'PENDING',
      },
    });

    // Get upcoming appointments (service requests scheduled in next 7 days)
    // Note: service_requests table may not exist in all environments
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingAppointments = 0;
    try {
      upcomingAppointments = await this.prisma.serviceRequest.count({
        where: {
          organizationId: { in: organizationIds },
          scheduledAt: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          status: { in: ['PENDING', 'CONFIRMED', 'SCHEDULED'] },
        },
      });
    } catch (error: unknown) {
      // Handle case where service_requests table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('ServiceRequest table does not exist, returning 0 for upcomingAppointments');
      } else {
        throw error;
      }
    }

    return {
      enrolled: enrolledCount,
      capacity: totalCapacity,
      availableSpots: Math.max(0, totalCapacity - enrolledCount),
      pendingApplications,
      upcomingAppointments,
      newLeads: newLeadsCount,
      trend: {
        enrolled: enrolledCount - previousEnrolledCount,
        leads: newLeadsCount - previousLeadsCount,
      },
    };
  }

  /**
   * Get recent activities for foundation dashboard
   */
  async getFoundationActivities(organizationIds: string[], limit = 10): Promise<FoundationActivity[]> {
    const activities: FoundationActivity[] = [];

    // Get recent job applications
    const recentApplications = await this.prisma.jobApplication.findMany({
      where: {
        jobListing: { foundationId: { in: organizationIds } },
      },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        jobListing: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const app of recentApplications) {
      activities.push({
        id: app.id,
        type: 'application',
        title: 'New Job Application',
        description: `${app.candidate.firstName || ''} ${app.candidate.lastName || ''} applied for ${app.jobListing.title}`.trim(),
        timestamp: app.createdAt.toISOString(),
        status: app.status.toLowerCase(),
        metadata: { jobListingId: app.jobListingId, candidateId: app.candidateId },
      });
    }

    // Get recent orders
    // Note: orders table may not exist in all environments
    try {
      const recentOrders = await this.prisma.order.findMany({
        where: { organizationId: { in: organizationIds } },
        include: {
          items: {
            include: { product: { select: { title: true, supplier: { select: { name: true } } } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const order of recentOrders) {
        const supplierName = order.items[0]?.product?.supplier?.name || 'Unknown Supplier';
        const itemCount = order.items.length;
        activities.push({
          id: order.id,
          type: 'order',
          title: 'Order Confirmation',
          description: `Order #${order.id.substring(0, 8)} from ${supplierName} (${itemCount} item${itemCount !== 1 ? 's' : ''})`,
          timestamp: order.createdAt.toISOString(),
          status: order.status.toLowerCase(),
          metadata: { totalAmount: order.totalAmount },
        });
      }
    } catch (error: unknown) {
      // Handle case where orders table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('Order table does not exist, skipping orders in activities');
      } else {
        throw error;
      }
    }

    // Get recent service requests
    // Note: service_requests table may not exist in all environments
    try {
      const recentServiceRequests = await this.prisma.serviceRequest.findMany({
        where: { organizationId: { in: organizationIds } },
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: { organization: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const req of recentServiceRequests) {
        const providerName = req.service?.provider?.organization?.name || 'Unknown Provider';
        activities.push({
          id: req.id,
          type: 'service',
          title: 'Service Update',
          description: `${req.service?.title || 'Service'} from ${providerName}`,
          timestamp: req.createdAt.toISOString(),
          status: req.status.toLowerCase(),
          metadata: { scheduledAt: req.scheduledAt?.toISOString() },
        });
      }
    } catch (error: unknown) {
      // Handle case where service_requests table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('ServiceRequest table does not exist, skipping service requests in activities');
      } else {
        throw error;
      }
    }

    // Get recent parent leads
    const recentLeads = await this.prisma.parentLead.findMany({
      where: {
        OR: [
          { foundationId: { in: organizationIds } },
          {
            foundationId: null,
            foundationResponses: { some: { foundationId: { in: organizationIds } } },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const lead of recentLeads) {
      activities.push({
        id: lead.id,
        type: 'lead',
        title: 'Parent Inquiry',
        description: `${lead.parentName} for ${lead.childAge}-year-old`,
        timestamp: lead.createdAt.toISOString(),
        status: lead.status.toLowerCase(),
        metadata: { childAge: lead.childAge, location: lead.preferredLocation },
      });
    }

    // Sort all activities by timestamp and return top N
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get calendar events for foundation
   */
  async getFoundationCalendarEvents(
    organizationIds: string[],
    date?: string,
  ): Promise<CalendarEvent[]> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get custom calendar events
    const customEvents = await this.prisma.calendarEvent.findMany({
      where: {
        organizationId: { in: organizationIds },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const events: CalendarEvent[] = customEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      eventType: event.eventType,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      allDay: event.allDay,
      location: event.location || undefined,
      relatedEntityType: event.relatedEntityType || undefined,
      relatedEntityId: event.relatedEntityId || undefined,
    }));

    // Add scheduled service requests as events
    // Note: service_requests table may not exist in all environments
    try {
      const scheduledServices = await this.prisma.serviceRequest.findMany({
        where: {
          organizationId: { in: organizationIds },
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          service: { select: { title: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      for (const service of scheduledServices) {
        // Defensive null check for scheduledAt
        if (!service.scheduledAt) continue;
        
        events.push({
          id: `service-${service.id}`,
          title: service.service?.title || 'Scheduled Service',
          description: service.description || undefined,
          eventType: 'service',
          startTime: service.scheduledAt.toISOString(),
          endTime: undefined,
          allDay: false,
          relatedEntityType: 'service_request',
          relatedEntityId: service.id,
        });
      }
    } catch (error: unknown) {
      // Handle case where service_requests table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') {
        console.warn('ServiceRequest table does not exist, skipping scheduled services in calendar');
      } else {
        throw error;
      }
    }

    // Sort by start time
    return events.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  /**
   * Get weather data for foundation location
   * Note: In production, this would integrate with a weather API
   */
  async getFoundationWeather(organizationIds: string[]): Promise<WeatherData | null> {
    // Get organization region/canton
    const organization = await this.prisma.organization.findFirst({
      where: { id: { in: organizationIds } },
      select: { canton: true, region: true, name: true },
    });

    if (!organization) {
      return null;
    }

    const location = organization.canton || organization.region || 'Switzerland';

    // In production, integrate with OpenWeatherMap, WeatherAPI.io, or similar
    // For now, return placeholder data based on region
    // This should be replaced with actual API call
    const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'];
    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const baseTemp = 15; // Base temperature
    const seasonalOffset = this.getSeasonalTemperatureOffset();
    const temperature = Math.round(baseTemp + seasonalOffset + (Math.random() * 6 - 3));

    return {
      temperature,
      condition: randomCondition,
      icon: this.getWeatherIcon(randomCondition),
      location,
    };
  }

  private getSeasonalTemperatureOffset(): number {
    const month = new Date().getMonth();
    // Summer months (Jun-Aug) are warmer, winter (Dec-Feb) are colder
    if (month >= 5 && month <= 7) return 10; // Summer
    if (month >= 2 && month <= 4) return 0; // Spring
    if (month >= 8 && month <= 10) return -5; // Autumn
    return -10; // Winter
  }

  private getWeatherIcon(condition: string): string {
    switch (condition) {
      case 'Sunny':
        return '☀️';
      case 'Partly Cloudy':
        return '⛅';
      case 'Cloudy':
        return '☁️';
      case 'Light Rain':
        return '🌧️';
      default:
        return '🌤️';
    }
  }

  /**
   * Create a calendar event
   */
  async createCalendarEvent(
    organizationId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      eventType: string;
      startTime: Date;
      endTime?: Date;
      allDay?: boolean;
      location?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
  ): Promise<CalendarEvent> {
    const event = await this.prisma.calendarEvent.create({
      data: {
        organizationId,
        createdBy: userId,
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay ?? false,
        location: data.location,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
    });

    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      eventType: event.eventType,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      allDay: event.allDay,
      location: event.location || undefined,
      relatedEntityType: event.relatedEntityType || undefined,
      relatedEntityId: event.relatedEntityId || undefined,
    };
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId: string, organizationIds: string[]): Promise<boolean> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: { in: organizationIds },
      },
    });

    if (!event) {
      return false;
    }

    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
    return true;
  }
}
