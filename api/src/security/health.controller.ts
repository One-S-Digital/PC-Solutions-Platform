import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClamAVService } from './clamav.service';
import { MimeValidationService } from './mime-validation.service';
import { QuarantineStorageService } from './quarantine-storage.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly clamAVService: ClamAVService,
    private readonly mimeValidationService: MimeValidationService,
    private readonly quarantineStorageService: QuarantineStorageService,
  ) {}

  @Get('clamav')
  @ApiOperation({ summary: 'Check ClamAV antivirus scanner health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async checkClamAV(): Promise<{
    healthy: boolean;
    version?: string;
    details: string;
    timestamp: string;
  }> {
    try {
      const isHealthy = await this.clamAVService.isHealthy();
      const version = isHealthy ? await this.clamAVService.getVersion() : undefined;
      
      return {
        healthy: isHealthy,
        version,
        details: isHealthy ? 'ClamAV is healthy and responding' : 'ClamAV is not responding',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        details: 'Health check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('upload')
  @ApiOperation({ summary: 'Check upload system health' })
  @ApiResponse({ status: 200, description: 'Upload system health check completed' })
  async checkUploadSystem(): Promise<{
    healthy: boolean;
    config: {
      maxFileSize: number;
      allowedExtensions: string[];
      allowedMimeTypes: string[];
      storageMode: string;
    };
    details: string;
    timestamp: string;
  }> {
    try {
      const config = {
        maxFileSize: this.mimeValidationService.getMaxFileSize(),
        allowedExtensions: this.mimeValidationService.getAllowedExtensions(),
        allowedMimeTypes: this.mimeValidationService.getAllowedMimeTypes(),
        storageMode: this.quarantineStorageService.getStorageMode(),
      };

      return {
        healthy: true,
        config,
        details: 'Upload system is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        config: {
          maxFileSize: 0,
          allowedExtensions: [],
          allowedMimeTypes: [],
          storageMode: 'unknown',
        },
        details: 'Upload system health check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('security')
  @ApiOperation({ summary: 'Check overall security system health' })
  @ApiResponse({ status: 200, description: 'Security system health check completed' })
  async checkSecuritySystem(): Promise<{
    healthy: boolean;
    components: {
      clamav: boolean;
      mimeValidation: boolean;
      quarantineStorage: boolean;
    };
    details: string;
    timestamp: string;
  }> {
    try {
      const clamavHealthy = await this.clamAVService.isHealthy();
      
      const components = {
        clamav: clamavHealthy,
        mimeValidation: true, // MimeValidationService is always healthy if instantiated
        quarantineStorage: true, // QuarantineStorageService is always healthy if instantiated
      };

      const allHealthy = Object.values(components).every(healthy => healthy);

      return {
        healthy: allHealthy,
        components,
        details: allHealthy ? 'All security components are healthy' : 'Some security components are unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        components: {
          clamav: false,
          mimeValidation: false,
          quarantineStorage: false,
        },
        details: 'Security system health check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}