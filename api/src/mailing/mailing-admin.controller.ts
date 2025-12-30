import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MailingService } from './mailing.service';
import { CreateMailingListDto } from './dto/create-mailing-list.dto';
import { UpdateMailingListDto } from './dto/update-mailing-list.dto';
import { CreateMailingCampaignDto } from './dto/create-mailing-campaign.dto';
import { SendMailingCampaignDto } from './dto/send-mailing-campaign.dto';
import { CreateOptOutDto } from './dto/create-opt-out.dto';
import { PreviewRecipientsDto } from './dto/preview-recipients.dto';

@Controller('admin/mailing')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class MailingAdminController {
  constructor(private readonly mailing: MailingService) {}

  // Lists
  @Get('lists')
  async listMailingLists(@Query('search') search?: string) {
    return this.mailing.listMailingLists({ search });
  }

  @Post('lists')
  async createMailingList(@Request() req: any, @Body() dto: CreateMailingListDto) {
    return this.mailing.createMailingList(req?.context?.userId, dto);
  }

  @Get('lists/:id')
  async getMailingList(@Param('id') id: string) {
    return this.mailing.getMailingList(id);
  }

  @Put('lists/:id')
  async updateMailingList(@Param('id') id: string, @Body() dto: UpdateMailingListDto) {
    return this.mailing.updateMailingList(id, dto);
  }

  @Delete('lists/:id')
  async deleteMailingList(@Param('id') id: string) {
    return this.mailing.deleteMailingList(id);
  }

  @Get('lists/:id/preview')
  async previewRecipients(@Param('id') id: string, @Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 20;
    return this.mailing.previewRecipients(id, Number.isFinite(n) ? n : 20);
  }

  @Post('preview')
  async previewRecipientsForDefinition(@Body() dto: PreviewRecipientsDto) {
    const limit = dto.limit ? Number(dto.limit) : undefined;
    return this.mailing.previewRecipientsForDefinition({
      type: dto.type,
      roles: dto.roles,
      regions: dto.regions,
      includeInactive: dto.includeInactive,
      memberUserIds: dto.memberUserIds,
      limit,
    });
  }

  @Get('lists/:id/export')
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const { filename, csv } = await this.mailing.exportRecipientsCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  // Helpers
  @Get('regions')
  async regions() {
    return this.mailing.getAvailableRegions();
  }

  @Get('users')
  async searchUsers(
    @Query('search') search?: string,
    @Query('roles') roles?: string,
    @Query('regions') regions?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const rolesArr = roles ? roles.split(',').map((r) => r.trim()).filter(Boolean) : undefined;
    const regionsArr = regions ? regions.split(',').map((r) => r.trim()).filter(Boolean) : undefined;
    return this.mailing.searchUsers({
      search,
      roles: rolesArr as any,
      regions: regionsArr,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // Campaigns
  @Get('campaigns')
  async listCampaigns(@Query('mailingListId') mailingListId?: string) {
    return this.mailing.listCampaigns(mailingListId);
  }

  @Post('campaigns')
  async createCampaign(@Request() req: any, @Body() dto: CreateMailingCampaignDto) {
    return this.mailing.createCampaign(req?.context?.userId, dto);
  }

  @Post('campaigns/:id/send')
  async sendCampaign(@Param('id') id: string, @Body() dto: SendMailingCampaignDto) {
    return this.mailing.sendCampaign({ campaignId: id, dryRun: dto.dryRun, testEmail: dto.testEmail });
  }

  // Opt-outs / suppressions
  @Get('opt-outs')
  async listOptOuts(
    @Query('search') search?: string,
    @Query('scope') scope?: 'GLOBAL' | 'LIST',
    @Query('mailingListId') mailingListId?: string,
  ) {
    return this.mailing.listOptOuts({ search, scope, mailingListId });
  }

  @Post('opt-outs')
  async createOptOut(@Body() dto: CreateOptOutDto) {
    return this.mailing.createOptOut(dto);
  }

  @Delete('opt-outs/:scope/:id')
  async deleteOptOut(@Param('scope') scope: 'GLOBAL' | 'LIST', @Param('id') id: string) {
    return this.mailing.deleteOptOut({ scope, id });
  }

  // Mail server config health
  @Get('email/test-connection')
  async testEmailConnection() {
    return this.mailing.testEmailConnection();
  }
}

