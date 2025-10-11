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
import { PolicyAlertsService } from './policy-alerts.service';
import { CreatePolicyAlertDto, UpdatePolicyAlertDto } from './dto/policy-alerts.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('policy-alerts')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class PolicyAlertsController {
  constructor(private readonly policyAlertsService: PolicyAlertsService) {}

  @Get()
  async getPolicyAlerts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('region') region?: string,
    @Query('alertType') alertType?: string,
    @Query('isActive') isActive?: string,
  ) {
    try {
      const alerts = await this.policyAlertsService.getPolicyAlerts({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        region,
        alertType,
        isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
      });
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      // Preserve existing HttpException status codes
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch policy alerts',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getPolicyAlert(@Param('id') id: string) {
    try {
      const alert = await this.policyAlertsService.getPolicyAlert(id);
      return {
        success: true,
        data: alert,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch policy alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async createPolicyAlert(@Body() createDto: CreatePolicyAlertDto) {
    try {
      const alert = await this.policyAlertsService.createPolicyAlert(createDto);
      return {
        success: true,
        data: alert,
        message: 'Policy alert created successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create policy alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async updatePolicyAlert(@Param('id') id: string, @Body() updateDto: UpdatePolicyAlertDto) {
    try {
      const alert = await this.policyAlertsService.updatePolicyAlert(id, updateDto);
      return {
        success: true,
        data: alert,
        message: 'Policy alert updated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update policy alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async deletePolicyAlert(@Param('id') id: string) {
    try {
      await this.policyAlertsService.deletePolicyAlert(id);
      return {
        success: true,
        message: 'Policy alert deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete policy alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/toggle')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async togglePolicyAlert(@Param('id') id: string) {
    try {
      const alert = await this.policyAlertsService.togglePolicyAlert(id);
      return {
        success: true,
        data: alert,
        message: `Policy alert ${alert.isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to toggle policy alert',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('regions/:region')
  async getPolicyAlertsByRegion(@Param('region') region: string) {
    try {
      const alerts = await this.policyAlertsService.getPolicyAlertsByRegion(region);
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch policy alerts for region',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard/summary')
  async getPolicyAlertsSummary() {
    try {
      const summary = await this.policyAlertsService.getPolicyAlertsSummary();
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch policy alerts summary',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}