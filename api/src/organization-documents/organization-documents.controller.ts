import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnsureProfileInterceptor } from '../principal/ensure-profile.interceptor';
import { OrganizationDocumentsService } from './organization-documents.service';
import {
  CreateOrganizationDocumentDto,
  UpdateOrganizationDocumentDto,
  OrganizationDocumentResponseDto,
} from './dto/organization-document.dto';

@ApiTags('organization-documents')
@Controller('organization-documents')
@UseGuards(ClerkAuthGuard, RolesGuard)
@UseInterceptors(EnsureProfileInterceptor)
@ApiBearerAuth()
export class OrganizationDocumentsController {
  private readonly logger = new Logger(OrganizationDocumentsController.name);

  constructor(
    private readonly organizationDocumentsService: OrganizationDocumentsService,
  ) {}

  private getContext(request: any) {
    const context = request?.context ?? {};
    const { profileId, accountId, clerkUserId } = context;
    if (!profileId || !accountId || !clerkUserId) {
      throw new UnauthorizedException('Authenticated user context missing');
    }
    return { profileId, accountId, clerkUserId };
  }

  /**
   * Get all documents for the current user's organization
   */
  @Get()
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Get organization profile documents' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: [OrganizationDocumentResponseDto],
  })
  async getDocuments(@Request() req) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.organizationDocumentsService.getUserOrganizationId(profileId);
    if (!organizationId) {
      return {
        success: true,
        data: [],
        message: 'No organization found',
      };
    }

    const documents = await this.organizationDocumentsService.getDocuments(organizationId);

    return {
      success: true,
      data: documents,
    };
  }

  /**
   * Create a new organization document
   */
  @Post()
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Create organization profile document' })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
    type: OrganizationDocumentResponseDto,
  })
  async createDocument(
    @Request() req,
    @Body() dto: CreateOrganizationDocumentDto,
  ) {
    const { profileId, accountId } = this.getContext(req);

    const organizationId = await this.organizationDocumentsService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    const document = await this.organizationDocumentsService.createDocument(
      organizationId,
      accountId,
      dto,
    );

    return {
      success: true,
      data: document,
      message: 'Document created successfully',
    };
  }

  /**
   * Update an organization document
   */
  @Patch(':id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Update organization profile document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: OrganizationDocumentResponseDto,
  })
  async updateDocument(
    @Request() req,
    @Param('id', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateOrganizationDocumentDto,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.organizationDocumentsService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    const document = await this.organizationDocumentsService.updateDocument(
      documentId,
      organizationId,
      dto,
    );

    return {
      success: true,
      data: document,
      message: 'Document updated successfully',
    };
  }

  /**
   * Delete an organization document
   */
  @Delete(':id')
  @Roles(UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER)
  @ApiOperation({ summary: 'Delete organization profile document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  async deleteDocument(
    @Request() req,
    @Param('id', ParseUUIDPipe) documentId: string,
  ) {
    const { profileId } = this.getContext(req);

    const organizationId = await this.organizationDocumentsService.getUserOrganizationId(profileId);
    if (!organizationId) {
      throw new BadRequestException('No organization found for this user');
    }

    await this.organizationDocumentsService.deleteDocument(documentId, organizationId);

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Get public documents for a specific organization (for public profile viewing)
   */
  @Get('public/:organizationId')
  @ApiOperation({ summary: 'Get public organization documents' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Public documents retrieved successfully',
    type: [OrganizationDocumentResponseDto],
  })
  async getPublicDocuments(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const documents = await this.organizationDocumentsService.getPublicDocuments(organizationId);

    return {
      success: true,
      data: documents,
    };
  }
}
