import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthPipelineGuard } from '../../auth/guards/auth-pipeline.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AiAdminService } from './ai-admin.service';

@Controller('ai/admin')
@UseGuards(AuthPipelineGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AiAdminController {
  constructor(private readonly svc: AiAdminService) {}

  @Get('overview')
  overview() {
    return this.svc.getOverview();
  }

  @Get('agents')
  agents() {
    return this.svc.getAgents();
  }

  @Get('audit')
  audit(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('agentName') agentName?: string,
    @Query('principalId') principalId?: string,
    @Query('cacheHit') cacheHit?: string,
    @Query('fallbackUsed') fallbackUsed?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getAuditLog({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 200),
      agentName,
      principalId,
      cacheHit: cacheHit !== undefined ? cacheHit === 'true' : undefined,
      fallbackUsed: fallbackUsed !== undefined ? fallbackUsed === 'true' : undefined,
      from,
      to,
    });
  }

  @Get('cost')
  cost() {
    return this.svc.getCostSummary();
  }

  @Get('knowledge')
  knowledge() {
    return this.svc.getKnowledge();
  }

  @Get('safety')
  safety() {
    return this.svc.getSafety();
  }

  @Get('env-check')
  envCheck() {
    return this.svc.getEnvCheck();
  }

  @Patch('flag')
  toggleFlag(@Body() body: { flagId: string; enabled: boolean }) {
    return this.svc.toggleFoundationFlag(body.flagId, body.enabled);
  }

  @Patch('agents/:name/config')
  updateAgentConfig(
    @Param('name') name: string,
    @Body() body: { promptVersion?: string; models?: string[]; dailyTokenBudget?: number },
  ) {
    return this.svc.updateAgentConfig(name, body);
  }
}
