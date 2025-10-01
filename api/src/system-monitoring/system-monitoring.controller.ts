import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { CreateHealthCheckDto, CreateSystemAlertDto, CreateSystemMetricsDto } from './dto/system-monitoring.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('system-monitoring')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SystemMonitoringController {
  constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

  @Get('health')
  async getSystemHealth() {
    try {
      const health = await this.systemMonitoringService.getSystemHealth();
      return {
        success: true,
        data: health,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch system health',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health/:serviceName')
  async getServiceHealth(@Param('serviceName') serviceName: string) {
    try {
      const health = await this.systemMonitoringService.getServiceHealth(serviceName);
      return {
        success: true,
        data: health,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch service health',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('health')
  @Roles(UserRole.SUPER_ADMIN)
  async createHealthCheck(@Body() createDto: CreateHealthCheckDto) {
    try {
      const healthCheck = await this.systemMonitoringService.createHealthCheck(createDto);
      return {
        success: true,
        data: healthCheck,
        message: 'Health check created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create health check',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  async getSystemMetrics(@Query('timeRange') timeRange?: string) {
    try {
      const metrics = await this.systemMonitoringService.getSystemMetrics(timeRange);
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch system metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('metrics')
  @Roles(UserRole.SUPER_ADMIN)
  async createSystemMetrics(@Body() createDto: CreateSystemMetricsDto) {
    try {
      const metrics = await this.systemMonitoringService.createSystemMetrics(createDto);
      return {
        success: true,
        data: metrics,
        message: 'System metrics created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create system metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts')
  async getSystemAlerts(@Query('status') status?: string) {
    try {
      const alerts = await this.systemMonitoringService.getSystemAlerts(status);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch system alerts',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alerts')
  @Roles(UserRole.SUPER_ADMIN)
  async createSystemAlert(@Body() createDto: CreateSystemAlertDto) {
    try {
      const alert = await this.systemMonitoringService.createSystemAlert(createDto);
      return {
        success: true,
        data: alert,
        message: 'System alert created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create system alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('alerts/:id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async resolveAlert(@Param('id') id: string, @Body() body: { resolvedBy: string }) {
    try {
      const alert = await this.systemMonitoringService.resolveAlert(id, body.resolvedBy);
      return {
        success: true,
        data: alert,
        message: 'Alert resolved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to resolve alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('alerts/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteAlert(@Param('id') id: string) {
    try {
      await this.systemMonitoringService.deleteAlert(id);
      return {
        success: true,
        message: 'Alert deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard')
  async getMonitoringDashboard() {
    try {
      const dashboard = await this.systemMonitoringService.getMonitoringDashboard();
      return {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch monitoring dashboard',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}