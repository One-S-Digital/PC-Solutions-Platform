import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ContentModerationService, ContentModerationFilters, ModerationAction, ContentFlag } from './content-moderation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/content-moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ContentModerationController {
  constructor(private readonly contentModerationService: ContentModerationService) {}

  @Get('queue')
  async getModerationQueue(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('contentType') contentType?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const filters: ContentModerationFilters = {
      contentType: contentType as any,
      status: status as any,
      priority: priority as any,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.contentModerationService.getModerationQueue(
      parseInt(page),
      parseInt(limit),
      filters,
      sortBy,
      sortOrder,
    );
  }

  @Get('stats')
  async getModerationStats() {
    return this.contentModerationService.getModerationStats();
  }

  @Get('content/:contentId/:contentType')
  async getContentDetails(
    @Param('contentId') contentId: string,
    @Param('contentType') contentType: string,
  ) {
    return this.contentModerationService.getContentDetails(contentId, contentType);
  }

  @Post('moderate')
  async moderateContent(@Body() action: ModerationAction) {
    return this.contentModerationService.moderateContent(action);
  }

  @Post('flag')
  async flagContent(@Body() flag: ContentFlag) {
    return this.contentModerationService.flagContent(flag);
  }

  @Get('history/:contentId')
  async getModerationHistory(@Param('contentId') contentId: string) {
    return this.contentModerationService.getModerationHistory(contentId);
  }

  @Get('rules')
  async getAutomatedRules() {
    return this.contentModerationService.getAutomatedRules();
  }

  @Put('rules/:ruleId')
  async updateAutomatedRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: any,
  ) {
    return this.contentModerationService.updateAutomatedRule(ruleId, updates);
  }
}