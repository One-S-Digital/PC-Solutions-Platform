import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { AssistantService } from './assistant.service';
import { AssistantPrincipalContext } from './orchestrator.service';

const ALL_ROLES = [
  UserRole.FOUNDATION,
  UserRole.EDUCATOR,
  UserRole.PARENT,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

function extractPrincipal(req: any): AssistantPrincipalContext {
  return {
    userId: req.context?.profileUserId ?? req.user?.id,
    role: (req.context?.role ?? req.user?.role) as UserRole,
    organizationId: req.context?.organizationId ?? req.user?.organizationId,
  };
}

@Controller('assistant')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('conversations')
  @Roles(...ALL_ROLES)
  createConversation(@Request() req: any) {
    const principal = extractPrincipal(req);
    return this.assistantService.createConversation({
      ...principal,
      locale: req.body?.locale ?? 'fr',
    });
  }

  @Get('conversations/:id')
  @Roles(...ALL_ROLES)
  getConversation(@Param('id') id: string, @Request() req: any) {
    return this.assistantService.getConversation(id, extractPrincipal(req));
  }

  @Post('conversations/:id/messages')
  @Roles(...ALL_ROLES)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() body: { message: string },
    @Request() req: any,
    @Res() res: Response,
  ) {
    await this.assistantService.streamMessage(
      conversationId,
      body.message,
      extractPrincipal(req),
      res,
    );
  }
}
