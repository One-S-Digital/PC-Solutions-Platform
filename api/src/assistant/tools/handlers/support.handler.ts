import { Injectable } from '@nestjs/common';
import { SupportService } from '../../../support/support.service';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

interface ContactAdminArgs {
  subject?: string;
  message?: string;
  category?: string;
  priority?: string;
}

/**
 * Universal escalation tool. Files a support ticket so the assistant never
 * dead-ends — used as the final fallback on any failed search or unmet need.
 * L3: executes only after the user confirms.
 */
@Injectable()
export class SupportHandler implements ToolHandler {
  readonly toolNames = ['contact_admin'];

  constructor(private readonly support: SupportService) {}

  async execute(
    _toolName: string,
    args: ContactAdminArgs,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const subject = (args.subject || '').trim() || 'Assistance request from the AI assistant';
    const message = (args.message || '').trim() || subject;

    const ticket = await this.support.createTicket(principal.userId, {
      subject,
      message,
      category: args.category || 'GENERAL',
      priority: args.priority || 'MEDIUM',
    });

    return {
      data: { ticketId: ticket.id, subject, status: ticket.status },
      total: 1,
    };
  }
}
