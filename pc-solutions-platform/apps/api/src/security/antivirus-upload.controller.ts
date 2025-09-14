import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ClamAVService } from './clamav.service';
import { MimeValidationService } from './mime-validation.service';
import { QuarantineStorageService } from './quarantine-storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

export interface AntivirusUploadResult {
  success: boolean;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  safeLocation: string;
  scanResult: 'clean' | 'infected' | 'error';
  scanDetails?: string;
}

@ApiTags('Antivirus Upload')
@Controller('antivirus-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AntivirusUploadController {
  private readonly logger = new Logger(AntivirusUploadController.name);

  constructor(
    private readonly clamAVService: ClamAVService,
    private readonly mimeValidationService: MimeValidationService,
    private readonly quarantineStorageService: QuarantineStorageService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Upload and scan file for malware' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File uploaded and scanned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or malware detected' })
  @ApiResponse({ status: 503, description: 'Virus scanner unavailable' })
  async uploadAndScan(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<AntivirusUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.id;
    const originalName = file.originalname;
    const buffer = file.buffer;

    this.logger.log(`Starting antivirus scan for user ${userId}, file: ${originalName}`);

    try {
      // Step 1: Validate MIME type and extension
      const mimeValidation = await this.mimeValidationService.validateFile(buffer, originalName);
      
      if (!mimeValidation.isValid) {
        this.logger.warn(`MIME validation failed for user ${userId}, file: ${originalName}, reason: ${mimeValidation.reason}`);
        throw new BadRequestException(`Invalid file: ${mimeValidation.reason}`);
      }

      // Step 2: Save to quarantine (for auditability)
      const quarantineResult = await this.quarantineStorageService.saveToQuarantine(buffer, originalName);
      
      // Step 3: Scan for malware
      let scanResult: 'clean' | 'infected' | 'error' = 'clean';
      let scanDetails: string | undefined;

      try {
        const isClean = await this.clamAVService.scanBuffer(buffer);
        
        if (!isClean) {
          scanResult = 'infected';
          scanDetails = 'Malware detected by ClamAV';
          this.logger.warn(`Malware detected for user ${userId}, file: ${originalName}`);
          
          // Clean up quarantine file
          await this.quarantineStorageService.deleteFromQuarantine(quarantineResult.key);
          
          throw new BadRequestException('File contains malware. Upload blocked.');
        }
        
        scanDetails = 'File scanned clean by ClamAV';
        this.logger.log(`File scan completed clean for user ${userId}, file: ${originalName}`);
        
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error; // Re-throw malware detection errors
        }
        
        scanResult = 'error';
        scanDetails = 'Virus scanner unavailable';
        this.logger.error(`ClamAV scan failed for user ${userId}, file: ${originalName}`, error);
        
        // Clean up quarantine file
        await this.quarantineStorageService.deleteFromQuarantine(quarantineResult.key);
        
        throw new ServiceUnavailableException('Virus scanner unavailable. Please try later.');
      }

      // Step 4: Promote to safe storage
      const safeResult = await this.quarantineStorageService.promoteToSafe(
        buffer,
        quarantineResult.key,
        mimeValidation.detectedMimeType
      );

      // Step 5: Clean up quarantine file
      await this.quarantineStorageService.deleteFromQuarantine(quarantineResult.key);

      const result: AntivirusUploadResult = {
        success: true,
        filename: quarantineResult.key,
        originalName,
        mimeType: mimeValidation.detectedMimeType,
        size: buffer.length,
        safeLocation: safeResult.location,
        scanResult,
        scanDetails,
      };

      this.logger.log(`Antivirus upload completed successfully for user ${userId}, file: ${originalName}`);
      
      return result;

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      this.logger.error(`Antivirus upload failed for user ${userId}, file: ${originalName}`, error);
      throw new BadRequestException('Upload failed. Please try again.');
    }
  }

  @Post('health')
  @ApiOperation({ summary: 'Check antivirus scanner health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async checkHealth(): Promise<{ healthy: boolean; details: string }> {
    try {
      const isHealthy = await this.clamAVService.isHealthy();
      const version = isHealthy ? await this.clamAVService.getVersion() : 'Unknown';
      
      return {
        healthy: isHealthy,
        details: isHealthy ? `ClamAV is healthy. Version: ${version}` : 'ClamAV is not responding',
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        healthy: false,
        details: 'Health check failed',
      };
    }
  }

  @Post('config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get antivirus configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getConfig(): Promise<{
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    maxFileSize: number;
    storageMode: string;
    quarantineBucket?: string;
    safeBucket?: string;
  }> {
    return {
      allowedExtensions: this.mimeValidationService.getAllowedExtensions(),
      allowedMimeTypes: this.mimeValidationService.getAllowedMimeTypes(),
      maxFileSize: this.mimeValidationService.getMaxFileSize(),
      storageMode: this.quarantineStorageService.getStorageMode(),
      quarantineBucket: this.quarantineStorageService.getQuarantineBucket(),
      safeBucket: this.quarantineStorageService.getSafeBucket(),
    };
  }
}