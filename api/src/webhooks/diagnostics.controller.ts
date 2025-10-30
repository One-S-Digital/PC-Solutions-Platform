import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks/diagnostics')
export class WebhookDiagnosticsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Public()
  async getDiagnostics() {
    console.log('🔍 [DIAGNOSTICS] Running webhook diagnostics...');
    
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('✅ [DIAGNOSTICS] Database connection: OK');

      // Check tables exist
      const appUserCount = await this.prisma.appUser.count();
      const userCount = await this.prisma.user.count();
      
      console.log('✅ [DIAGNOSTICS] Table counts:', { appUserCount, userCount });

      // Get recent users
      const recentAppUsers = await this.prisma.appUser.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clerkId: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const recentUsers = await this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Check for test webhook users
      const testWebhookUsers = await this.prisma.appUser.findMany({
        where: {
          email: {
            contains: 'clerk-test-webhook.local',
          },
        },
        take: 10,
      });

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          appUserCount,
          userCount,
        },
        recentAppUsers: recentAppUsers.map(u => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
        recentUsers: recentUsers.map(u => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
        testWebhookUsers: testWebhookUsers.map(u => ({
          id: u.id,
          clerkId: u.clerkId,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        })),
        webhookEndpoint: '/api/webhooks/clerk',
        instructions: {
          message: 'If appUserCount and userCount are 0, no webhooks have created users',
          checkLogs: 'Look for lines with [E2E DEBUG] in Render logs',
          testWebhookNote: 'Clerk test webhooks create users with email ending in @clerk-test-webhook.local',
        },
      };
    } catch (error) {
      console.error('❌ [DIAGNOSTICS] Error:', error);
      return {
        status: 'error',
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Get('recent')
  @Public()
  async getRecentActivity() {
    console.log('🔍 [DIAGNOSTICS] Checking recent activity...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentAppUsers = await this.prisma.appUser.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentUsers = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      timestamp: new Date().toISOString(),
      lastHour: {
        appUsersCreated: recentAppUsers.length,
        usersCreated: recentUsers.length,
        appUsers: recentAppUsers,
        users: recentUsers,
      },
      message: recentAppUsers.length === 0 && recentUsers.length === 0
        ? 'No users created in the last hour. Check if webhooks are reaching the endpoint.'
        : `${recentAppUsers.length} users created in the last hour`,
    };
  }
}
