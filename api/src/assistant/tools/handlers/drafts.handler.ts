import { Injectable } from '@nestjs/common';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * L2 draft tools. They do not mutate state — they return a modal identifier and
 * a prefill payload so the frontend can open a pre-filled form for the user to
 * review and submit.
 */
@Injectable()
export class DraftsHandler implements ToolHandler {
  readonly toolNames = ['draft_job_post', 'draft_parent_reply'];

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    _principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    if (toolName === 'draft_job_post') {
      return {
        data: {
          modal: 'job_post_modal',
          prefill: {
            role: args.role,
            canton: args.canton,
            workPercentage: args.percentage,
            notes: args.notes,
            ...(args.foundationId ? { foundationId: args.foundationId } : {}),
          },
        },
        total: 1,
      };
    }

    // draft_parent_reply
    return {
      data: {
        modal: 'parent_reply_modal',
        prefill: { leadId: args.leadId, draftMessage: args.context },
      },
      total: 1,
    };
  }
}
