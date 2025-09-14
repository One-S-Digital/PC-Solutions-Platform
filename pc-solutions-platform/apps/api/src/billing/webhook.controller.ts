import { Controller, Post, Req, Res, Headers, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BillingService } from './billing.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private stripe: Stripe;

  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-08-27.basil',
    });
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    const payload = req.rawBody;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', (err as Error).message);
      return res.status(400).send('Webhook signature verification failed');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.billingService.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.paid':
          await this.billingService.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.billingService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.updated':
          await this.billingService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.billingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'payment_intent.succeeded':
          // Handle one-time payment success for licenses
          // This is handled in checkout.session.completed for licenses
          break;

        case 'charge.refunded':
          // Handle refunds for licenses
          // TODO: Implement license revocation logic
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}