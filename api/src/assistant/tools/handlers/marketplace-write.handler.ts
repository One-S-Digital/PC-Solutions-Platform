import { Injectable } from '@nestjs/common';
import { MarketplaceService } from '../../../marketplace/marketplace.service';
import { InquiryService } from '../../../marketplace/inquiry.service';
import {
  AssistantPrincipal,
  resolveOnBehalfOrgId,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * L3 marketplace write actions: placing product orders, requesting services, and
 * sending formal supplier inquiries. Each executes only after user confirmation.
 */
@Injectable()
export class MarketplaceWriteHandler implements ToolHandler {
  readonly toolNames = ['place_order', 'place_supply_order', 'request_service', 'send_supplier_inquiry'];

  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly inquiry: InquiryService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'place_order':
      case 'place_supply_order':
        return this.placeOrder(args, principal);
      case 'request_service':
        return this.requestService(args, principal);
      case 'send_supplier_inquiry':
        return this.sendSupplierInquiry(args, principal);
      default:
        throw new Error(`MarketplaceWriteHandler cannot handle tool "${toolName}"`);
    }
  }

  // ── place_order ───────────────────────────────────────────────────────────
  private async placeOrder(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const organizationId = resolveOnBehalfOrgId(args, principal);
    if (!organizationId) {
      throw new Error('An organization is required to place an order.');
    }
    const items = this.resolveOrderItems(args);
    if (items.length === 0) {
      throw new Error('At least one product (with quantity) is required to place an order.');
    }
    const order = await this.marketplace.createOrder(
      { items, notes: (args.notes as string) || undefined },
      organizationId,
    );
    return {
      data: { id: order.id, totalAmount: (order as any).totalAmount ?? null, status: order.status },
      total: 1,
    };
  }

  /** Accept either a single productId+quantity or an items[] array. */
  private resolveOrderItems(args: Record<string, unknown>): { productId: string; quantity: number }[] {
    if (Array.isArray(args.items)) {
      return (args.items as any[])
        .filter((i) => i && i.productId)
        .map((i) => ({ productId: String(i.productId), quantity: Math.max(1, Number(i.quantity) || 1) }));
    }
    const productId = (args.productId as string) || undefined;
    if (!productId) return [];
    return [{ productId, quantity: Math.max(1, Number(args.quantity) || 1) }];
  }

  // ── request_service ───────────────────────────────────────────────────────
  private async requestService(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const organizationId = resolveOnBehalfOrgId(args, principal);
    if (!organizationId) {
      throw new Error('An organization is required to request a service.');
    }
    const serviceId = (args.serviceId as string) || (args.id as string);
    if (!serviceId) throw new Error('A serviceId is required.');

    const scheduledAt = args.scheduledAt ? new Date(args.scheduledAt as string) : undefined;
    const request = await this.marketplace.createServiceRequest(
      organizationId,
      serviceId,
      (args.description as string) || undefined,
      scheduledAt && !isNaN(scheduledAt.getTime()) ? scheduledAt : undefined,
    );
    return { data: { id: request.id, status: request.status, serviceId }, total: 1 };
  }

  // ── send_supplier_inquiry ─────────────────────────────────────────────────
  private async sendSupplierInquiry(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const buyerOrgId = resolveOnBehalfOrgId(args, principal);
    if (!buyerOrgId) {
      throw new Error('An organization is required to send a supplier inquiry.');
    }
    const supplierId = (args.supplierId as string) || undefined;
    const message = (args.message as string) || undefined;
    if (!supplierId) throw new Error('A supplierId is required.');
    if (!message) throw new Error('An inquiry message is required.');

    const created = await this.inquiry.createInquiry(
      {
        supplierId,
        message,
        subject: (args.subject as string) || undefined,
        productInterest: (args.productInterest as string) || undefined,
        quantity: args.quantity != null ? Number(args.quantity) : undefined,
      },
      buyerOrgId,
    );
    return { data: { id: (created as any).id, supplierId }, total: 1 };
  }
}
