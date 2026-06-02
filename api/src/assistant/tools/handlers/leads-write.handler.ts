import { Injectable } from '@nestjs/common';
import { LeadsService, LeadResponseStatus } from '../../../leads/leads.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

const RESPONSE_STATUSES: LeadResponseStatus[] = [
  'INTERESTED',
  'NOT_INTERESTED',
  'NEEDS_MORE_INFO',
  'ENROLLED',
];

/**
 * L3 lead write actions: a foundation responding to a parent lead, and a parent
 * submitting a new childcare enquiry. Both execute only after user confirmation.
 */
@Injectable()
export class LeadsWriteHandler implements ToolHandler {
  readonly toolNames = ['respond_to_lead', 'submit_enquiry'];

  constructor(
    private readonly leads: LeadsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    if (toolName === 'respond_to_lead') {
      return this.respondToLead(args, principal);
    }
    return this.submitEnquiry(args, principal);
  }

  // ── respond_to_lead (foundation) ──────────────────────────────────────────
  private async respondToLead(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const foundationId = (args.foundationId as string) || principal.organizationId;
    if (!foundationId) {
      throw new Error('A foundationId is required to respond to a lead.');
    }
    const leadId = (args.leadId as string) || (args.id as string);
    if (!leadId) throw new Error('A leadId is required.');

    const rawStatus = ((args.status as string) || 'INTERESTED').toUpperCase();
    const status = (RESPONSE_STATUSES.includes(rawStatus as LeadResponseStatus)
      ? rawStatus
      : 'INTERESTED') as LeadResponseStatus;

    const response = await this.leads.respondToLead(
      leadId,
      foundationId,
      status,
      (args.message as string) || undefined,
    );
    return { data: { leadId, status, responseId: (response as any)?.id ?? null }, total: 1 };
  }

  // ── submit_enquiry (parent) ───────────────────────────────────────────────
  private async submitEnquiry(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    // Fall back to the parent's own profile for identity fields they did not
    // restate in chat, so they don't have to repeat their name/email.
    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const parentName =
      (args.parentName as string) ||
      `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
      'Parent';
    const parentEmail = (args.parentEmail as string) || user?.email || '';

    const childAge = args.childAge != null ? Number(args.childAge) : 0;

    const lead = await this.leads.createParentLead({
      parentName,
      parentEmail,
      parentPhone: (args.parentPhone as string) || undefined,
      childName: (args.childName as string) || 'Child',
      childAge: Number.isFinite(childAge) ? childAge : 0,
      message: (args.message as string) || undefined,
      preferredLocation: (args.preferredLocation as string) || (args.location as string) || undefined,
      foundationId: (args.foundationId as string) || undefined,
    });
    return {
      data: { id: lead.id, status: lead.status, foundationId: lead.foundationId ?? null },
      total: 1,
    };
  }
}
