import { Injectable } from '@nestjs/common';
import { MessagingService } from '../../../messaging/messaging.service';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * L3 messaging tool. Sends a direct message from the current user to another
 * platform user. Universal — any role may message another user (e.g. an educator
 * messaging a foundation, a parent messaging admin). Executes only after the user
 * confirms.
 */
@Injectable()
export class MessagingHandler implements ToolHandler {
  readonly toolNames = ['send_message'];

  constructor(private readonly messaging: MessagingService) {}

  async execute(
    _toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const receiverId = (args.recipientUserId as string) || (args.receiverId as string);
    const content = (args.content as string) || (args.message as string) || '';
    if (!receiverId) throw new Error('A recipient is required to send a message.');
    if (!content.trim()) throw new Error('Message content is required.');

    const message = await this.messaging.createDirectMessage(principal.userId, receiverId, content);
    return {
      data: { id: (message as any)?.id ?? null, receiverId },
      total: 1,
    };
  }
}
