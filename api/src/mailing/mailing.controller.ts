import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { MailingService, EXPORTABLE_COLUMNS } from './mailing.service';
import { PreviewRequestDto } from './dto/preview.dto';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto';
import { CreateCampaignDto, SendBatchDto } from './dto/campaign.dto';
import { ExportRequestDto } from './dto/export.dto';
import { CreateCustomListDto, UpdateCustomListDto, ManageCustomListMembersDto } from './dto/custom-list.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { MailingFiltersDto } from './dto/mailing-filters.dto';

@ApiTags('admin/mailing')
@Controller('admin/mailing')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
export class MailingController {
  private readonly logger = new Logger(MailingController.name);

  constructor(private readonly mailingService: MailingService) {}

  /** Extract admin user ID from request context, or throw if missing. */
  private getAdminId(req: any): string {
    // Use the database UUID, not the Clerk ID (req.context.userId is 'user_xxx' format)
    const adminId = req.context?.appUserId || req.user?.id;
    if (!adminId) {
      throw new BadRequestException('Unable to determine admin user ID from request context');
    }
    return adminId;
  }

  /* ================================================================ */
  /*  HEALTH (public — verifies routes are registered)                 */
  /* ================================================================ */

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Mailing module health check' })
  async health() {
    return { status: 'ok', module: 'mailing', timestamp: new Date().toISOString() };
  }

  @Get('transport-status')
  @ApiOperation({ summary: 'Check email transport configuration (admin only)' })
  async transportStatus() {
    return this.mailingService.getTransportStatus();
  }

  /* ================================================================ */
  /*  PREVIEW                                                          */
  /* ================================================================ */

  @Post('preview')
  @ApiOperation({ summary: 'Preview recipients matching filters' })
  async previewRecipients(@Body() body: PreviewRequestDto) {
    return this.mailingService.previewRecipients(
      body.filters,
      body.page || 1,
      body.pageSize || 20,
      body.sort || 'email',
      (body.sortOrder as 'asc' | 'desc') || 'asc',
    );
  }

  /* ================================================================ */
  /*  SEGMENTS                                                         */
  /* ================================================================ */

  @Post('segments')
  @ApiOperation({ summary: 'Create a saved segment' })
  async createSegment(@Body() body: CreateSegmentDto, @Request() req: any) {
    const adminId = this.getAdminId(req);
    return this.mailingService.createSegment(body.name, body.filters, adminId, body.description);
  }

  @Get('segments')
  @ApiOperation({ summary: 'List saved segments' })
  async listSegments(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailingService.listSegments(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('segments/:id')
  @ApiOperation({ summary: 'Get segment detail' })
  async getSegment(@Param('id') id: string) {
    return this.mailingService.getSegment(id);
  }

  @Put('segments/:id')
  @ApiOperation({ summary: 'Update a segment' })
  async updateSegment(@Param('id') id: string, @Body() body: UpdateSegmentDto) {
    return this.mailingService.updateSegment(id, body);
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Delete a segment' })
  async deleteSegment(@Param('id') id: string) {
    await this.mailingService.deleteSegment(id);
    return { success: true, message: 'Segment deleted' };
  }

  @Post('segments/:id/refresh')
  @ApiOperation({ summary: 'Recompute segment estimated size' })
  async refreshSegment(@Param('id') id: string) {
    return this.mailingService.refreshSegmentSize(id);
  }

  /* ================================================================ */
  /*  EXPORT                                                           */
  /* ================================================================ */

  @Post('export')
  @ApiOperation({ summary: 'Export recipients as CSV/XLSX' })
  async exportRecipients(
    @Body() body: ExportRequestDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const adminId = this.getAdminId(req);

    if (body.customListId && body.segmentId) {
      throw new BadRequestException('customListId and segmentId are mutually exclusive');
    }

    // Resolve filters, accounting for custom list targeting
    let filters: MailingFiltersDto;
    if (body.customListId) {
      const memberIds = await this.mailingService.getAllCustomListMemberIds(body.customListId);
      if (memberIds.length === 0) {
        throw new BadRequestException('Custom list has no members');
      }
      filters = { ...(body.filters || {}), userIds: memberIds };
    } else {
      filters = await this.mailingService.resolveFilters(body.filters, body.segmentId);
    }

    const result = await this.mailingService.exportRecipients(
      filters,
      body.columns,
      body.deduplicateByEmail ?? true,
      adminId,
      body.segmentId ?? body.customListId,
    );

    const filename = `mailing_export_${new Date().toISOString().slice(0, 10)}`;

    if (body.format === 'csv') {
      const header = result.columns.join(',');
      const csvRows = result.rows.map((row) =>
        result.columns.map((col) => `"${(row[col] || '').replace(/"/g, '""')}"`).join(','),
      );
      const csv = [header, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    // XLSX format — separate the require from the write so we only
    // fall back to CSV when the module is missing, not on write errors.
    let ExcelJS: any;
    try {
      ExcelJS = require('exceljs');
    } catch {
      this.logger.warn('exceljs not installed, falling back to CSV export');
    }

    if (ExcelJS) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Recipients');

      worksheet.columns = result.columns.map((col: string) => ({
        header: col,
        key: col,
        width: 20,
      }));

      for (const row of result.rows) {
        worksheet.addRow(row);
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    // CSV fallback (when exceljs not available or format is CSV)
    const header = result.columns.join(',');
    const csvRows = result.rows.map((row) =>
      result.columns.map((col) => `"${(row[col] || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`).join(','),
    );
    const csv = [header, ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }

  @Get('export/columns')
  @ApiOperation({ summary: 'List available export columns' })
  async getExportColumns() {
    return { columns: EXPORTABLE_COLUMNS };
  }

  /* ================================================================ */
  /*  CAMPAIGNS                                                        */
  /* ================================================================ */

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a campaign' })
  async createCampaign(@Body() body: CreateCampaignDto, @Request() req: any) {
    const adminId = this.getAdminId(req);

    if (body.customListId && body.segmentId) {
      throw new BadRequestException('customListId and segmentId are mutually exclusive');
    }

    let filters: MailingFiltersDto = body.filters;

    // If targeting a custom list, resolve the member user IDs and inject them into filters
    if (body.customListId) {
      const memberIds = await this.mailingService.getAllCustomListMemberIds(body.customListId);
      if (memberIds.length === 0) {
        throw new BadRequestException('Custom list has no members');
      }
      filters = { ...filters, userIds: memberIds };
    }

    return this.mailingService.createCampaign(
      body.subject,
      body.bodyHtml,
      body.bodyText,
      adminId,
      filters,
      body.customListId ? undefined : body.segmentId,
    );
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List campaigns' })
  async listCampaigns(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailingService.listCampaigns(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign detail' })
  async getCampaign(@Param('id') id: string) {
    return this.mailingService.getCampaign(id);
  }

  @Post('campaigns/:id/send-batch')
  @ApiOperation({ summary: 'Send next batch of campaign emails' })
  async sendBatch(@Param('id') id: string, @Body() body: SendBatchDto) {
    return this.mailingService.sendBatch(id, body.batchSize || 100);
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Cancel a campaign' })
  async cancelCampaign(@Param('id') id: string, @Request() req: any) {
    const adminId = this.getAdminId(req);
    await this.mailingService.cancelCampaign(id, adminId);
    return { success: true, message: 'Campaign cancelled' };
  }

  /* ================================================================ */
  /*  CUSTOM LISTS                                                     */
  /* ================================================================ */

  @Post('custom-lists')
  @ApiOperation({ summary: 'Create a custom mailing list' })
  async createCustomList(@Body() body: CreateCustomListDto, @Request() req: any) {
    const adminId = this.getAdminId(req);
    return this.mailingService.createCustomList(body.name, adminId, body.description);
  }

  @Get('custom-lists')
  @ApiOperation({ summary: 'List custom mailing lists' })
  async listCustomLists(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailingService.listCustomLists(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get('custom-lists/:id')
  @ApiOperation({ summary: 'Get custom list detail' })
  async getCustomList(@Param('id') id: string) {
    return this.mailingService.getCustomList(id);
  }

  @Put('custom-lists/:id')
  @ApiOperation({ summary: 'Update a custom list' })
  async updateCustomList(@Param('id') id: string, @Body() body: UpdateCustomListDto) {
    return this.mailingService.updateCustomList(id, body);
  }

  @Delete('custom-lists/:id')
  @ApiOperation({ summary: 'Delete a custom list' })
  async deleteCustomList(@Param('id') id: string) {
    await this.mailingService.deleteCustomList(id);
    return { success: true, message: 'Custom list deleted' };
  }

  @Post('custom-lists/:id/members')
  @ApiOperation({ summary: 'Add users to a custom list' })
  async addUsersToCustomList(@Param('id') id: string, @Body() body: ManageCustomListMembersDto) {
    return this.mailingService.addUsersToCustomList(id, body.userIds);
  }

  @Post('custom-lists/:id/members/remove')
  @ApiOperation({ summary: 'Remove users from a custom list' })
  async removeUsersFromCustomList(@Param('id') id: string, @Body() body: ManageCustomListMembersDto) {
    return this.mailingService.removeUsersFromCustomList(id, body.userIds);
  }

  @Get('custom-lists/:id/members')
  @ApiOperation({ summary: 'List members of a custom list' })
  async getCustomListMembers(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailingService.getCustomListMembers(
      id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /* ================================================================ */
  /*  EMAIL TEMPLATES                                                  */
  /* ================================================================ */

  @Post('templates')
  @ApiOperation({ summary: 'Create an email template' })
  async createTemplate(@Body() body: CreateTemplateDto, @Request() req: any) {
    const adminId = this.getAdminId(req);
    return this.mailingService.createTemplate(body, adminId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List email templates' })
  async listTemplates(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailingService.listTemplates(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get email template detail' })
  async getTemplate(@Param('id') id: string) {
    return this.mailingService.getTemplate(id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update an email template' })
  async updateTemplate(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.mailingService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete an email template' })
  async deleteTemplate(@Param('id') id: string) {
    await this.mailingService.deleteTemplate(id);
    return { success: true, message: 'Template deleted' };
  }
}
