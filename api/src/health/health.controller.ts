import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pc-solutions-api',
    };
  }

  @Get('database')
  @Public()
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async checkDatabase() {
    try {
      // Try to execute a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check if users table exists
      let tablesExist = false;
      try {
        const userCount = await this.prisma.user.count();
        tablesExist = true;
        
        return {
          status: 'healthy',
          database: 'connected',
          tables: 'initialized',
          userCount,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('does not exist')) {
          return {
            status: 'unhealthy',
            database: 'connected',
            tables: 'not_initialized',
            error: 'Database tables not found. Run migrations: npx prisma migrate deploy',
            timestamp: new Date().toISOString(),
          };
        }
        throw error;
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check if critical tables exist
      try {
        await this.prisma.user.count();
        await this.prisma.organization.count();
      } catch (error) {
        if (error instanceof Error && error.message.includes('does not exist')) {
          return {
            status: 'not_ready',
            reason: 'Database not initialized',
            message: 'Run migrations: npx prisma migrate deploy',
            timestamp: new Date().toISOString(),
          };
        }
      }
      
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        reason: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Database snapshot (sanitized)' })
  @ApiResponse({ status: 200, description: 'Returns counts and sample data' })
  async snapshot() {
    try {
      const [
        userCount,
        appUserCount,
        orgCount,
        assetCount,
        settingsCount,
      ] = await Promise.all([
        this.prisma.user.count().catch(() => 0),
        // @ts-ignore - model exists in schema
        this.prisma.appUser.count().catch(() => 0),
        this.prisma.organization.count().catch(() => 0),
        this.prisma.asset.count().catch(() => 0),
        this.prisma.frontendSettings.count().catch(() => 0),
      ]);

      const [
        users,
        appUsers,
        settings,
      ] = await Promise.all([
        this.prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, clerkId: true, email: true, role: true, createdAt: true },
        }).catch(() => []),
        // @ts-ignore - model exists in schema
        this.prisma.appUser.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, clerkId: true, role: true, createdAt: true, email: true },
        }).catch(() => []),
        this.prisma.frontendSettings.findFirst({
          include: {
            logoAsset: { select: { id: true, publicUrl: true } },
            faviconAsset: { select: { id: true, publicUrl: true } },
            ogImageAsset: { select: { id: true, publicUrl: true } },
            adminLogoAsset: { select: { id: true, publicUrl: true } },
            adminFaviconAsset: { select: { id: true, publicUrl: true } },
          },
        }).catch(() => null),
      ]);

      return {
        success: true,
        message: 'Database snapshot',
        data: {
          counts: {
            users: userCount,
            appUsers: appUserCount,
            organizations: orgCount,
            assets: assetCount,
            frontendSettings: settingsCount,
          },
          samples: {
            users,
            appUsers,
            frontendSettings: settings
              ? {
                  id: settings.id,
                  primaryColor: settings.primaryColor,
                  secondaryColor: settings.secondaryColor,
                  accentColor: (settings as any).accentColor ?? undefined,
                  adminPrimaryColor: settings.adminPrimaryColor,
                  adminSecondaryColor: settings.adminSecondaryColor,
                  adminAccentColor: settings.adminAccentColor,
                  hasLogo: !!settings.logoAssetId,
                  hasFavicon: !!settings.faviconAssetId,
                  hasOgImage: !!settings.ogImageAssetId,
                  hasAdminLogo: !!settings.adminLogoAssetId,
                  hasAdminFavicon: !!settings.adminFaviconAssetId,
                }
              : null,
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Snapshot failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (sanitized, queryable)' })
  @ApiResponse({ status: 200, description: 'Returns users' })
  async listUsers(
    @Query('email') email?: string,
    @Query('clerkId') clerkId?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          email ? { email: { contains: email, mode: 'insensitive' } } : {},
          clerkId ? { clerkId } : {},
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, clerkId: true, email: true, role: true, createdAt: true },
    });
    return { success: true, data: users, count: users.length, timestamp: new Date().toISOString() };
  }

  @Get('app-users')
  @ApiOperation({ summary: 'List AppUsers (sanitized, queryable)' })
  @ApiResponse({ status: 200, description: 'Returns app users' })
  async listAppUsers(
    @Query('clerkId') clerkId?: string,
    @Query('clerkUserId') clerkUserId?: string, // Deprecated: use clerkId instead
    @Query('limit') limit?: string,
  ) {
    // Support both clerkId and clerkUserId for backwards compatibility
    const clerkIdFilter = clerkId || clerkUserId;
    const take = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    // @ts-ignore - model exists
    const appUsers = await this.prisma.appUser.findMany({
      where: clerkIdFilter ? { clerkId: clerkIdFilter } : {},
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, clerkId: true, role: true, createdAt: true },
    });
    return { success: true, data: appUsers, count: appUsers.length, timestamp: new Date().toISOString() };
  }
}