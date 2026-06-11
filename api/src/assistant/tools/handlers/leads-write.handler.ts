import { Injectable } from '@nestjs/common';
import { LeadsService, LeadResponseStatus } from '../../../leads/leads.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  resolveOnBehalfOrgId,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

const RESPONSE_STATUSES: LeadResponseStatus[] = [
  'INTERESTED',
  'NOT_INTERESTED',
  'NEEDS_MORE_INFO',
  'ENROLLED',
];

/** Minimal email sanity check (the DTO's @IsEmail is bypassed on this path). */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * L3 lead write actions: a foundation responding to a parent lead, submitting a
 * new childcare enquiry, and confirming a reviewed draft reply. All execute only
 * after user confirmation.
 */
@Injectable()
export class LeadsWriteHandler implements ToolHandler {
  readonly toolNames = ['respond_to_lead', 'submit_enquiry', 'draft_lead_reply'];

  constructor(
    private readonly leads: LeadsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    if (toolName === 'respond_to_lead') return this.respondToLead(args, principal);
    if (toolName === 'draft_lead_reply') return this.sendDraftReply(args, principal);
    return this.submitEnquiry(args, principal);
  }

  // ── draft_lead_reply (L3 confirm: sends the approved draft to the parent) ──
  private async sendDraftReply(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const foundationId = resolveOnBehalfOrgId(args, principal);
    if (!foundationId) {
      throw new Error('A foundationId is required to send a reply.');
    }
    const leadId = (args.leadId as string) || (args.id as string);
    if (!leadId) throw new Error('A leadId is required.');
    const message = ((args.draftText as string) || (args.message as string) || '').trim();
    if (!message) throw new Error('A non-empty draft message is required to send a reply.');

    const response = await this.leads.respondToLead(
      leadId,
      foundationId,
      'INTERESTED',
      message,
    );
    return {
      data: { leadId, status: 'INTERESTED', responseId: (response as any)?.id ?? null, sent: true },
      total: 1,
    };
  }

  // ── respond_to_lead (foundation) ──────────────────────────────────────────
  private async respondToLead(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    // Pin to the caller's own org (admins may target another via find_foundation).
    // The service authorises the lead against this foundationId, so it must not
    // be spoofable from another tenant.
    const foundationId = resolveOnBehalfOrgId(args, principal);
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
    // The handler bypasses the controller's ValidationPipe (@IsEmail on the DTO),
    // and parentEmail is a NOT-NULL column — so validate here to avoid persisting
    // an enquiry with a blank/garbage, unreachable email.
    const parentEmail = ((args.parentEmail as string) || user?.email || '').trim();
    if (!isValidEmail(parentEmail)) {
      throw new Error('A valid parent email is required to submit an enquiry.');
    }

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
