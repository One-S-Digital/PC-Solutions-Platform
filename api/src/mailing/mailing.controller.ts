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
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MailingService, EXPORTABLE_COLUMNS } from './mailing.service';
import { PreviewRequestDto } from './dto/preview.dto';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segment.dto';
import { CreateCampaignDto, SendBatchDto } from './dto/campaign.dto';
import { ExportRequestDto } from './dto/export.dto';

@ApiTags('admin/mailing')
@Controller('admin/mailing')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
export class MailingController {
  private readonly logger = new Logger(MailingController.name);

  constructor(private readonly mailingService: MailingService) {}

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
    const adminId = req.context?.userId || req.user?.id || 'unknown';
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
    const adminId = req.context?.userId || req.user?.id || 'unknown';
    const filters = await this.mailingService.resolveFilters(body.filters, body.segmentId);

    const result = await this.mailingService.exportRecipients(
      filters,
      body.columns,
      body.deduplicateByEmail ?? true,
      adminId,
      body.segmentId,
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

    // XLSX format
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Recipients');

      worksheet.columns = result.columns.map((col) => ({
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
    } catch {
      // exceljs not available, fall back to CSV
      this.logger.warn('exceljs not available, falling back to CSV');
      const header = result.columns.join(',');
      const csvRows = result.rows.map((row) =>
        result.columns.map((col) => `"${(row[col] || '').replace(/"/g, '""')}"`).join(','),
      );
      const csv = [header, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }
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
    const adminId = req.context?.userId || req.user?.id || 'unknown';
    return this.mailingService.createCampaign(
      body.subject,
      body.bodyHtml,
      body.bodyText,
      adminId,
      body.filters,
      body.segmentId,
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
    const adminId = req.context?.userId || req.user?.id || 'unknown';
    await this.mailingService.cancelCampaign(id, adminId);
    return { success: true, message: 'Campaign cancelled' };
  }
}
