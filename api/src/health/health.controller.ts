import { Controller, Get } from '@nestjs/common';
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
}