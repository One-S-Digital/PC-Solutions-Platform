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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';
import { AssistantService } from './assistant.service';
import { AssistantPrincipalContext } from './orchestrator.service';

function extractPrincipal(req: any): AssistantPrincipalContext {
  return {
    userId: req.user.userId,
    role: req.user.role as UserRole,
    organizationId: req.user.organizationId,
  };
}

@Controller('assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('conversations')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createConversation(@Request() req: any) {
    const principal = extractPrincipal(req);
    return this.assistantService.createConversation({
      ...principal,
      locale: req.body?.locale ?? 'fr',
    });
  }

  @Get('conversations/:id')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getConversation(@Param('id') id: string, @Request() req: any) {
    return this.assistantService.getConversation(id, extractPrincipal(req));
  }

  @Post('conversations/:id/messages')
  @Roles(UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
