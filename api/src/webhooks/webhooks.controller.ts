import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ClerkWebhookDto } from './dto/clerk-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  async clerkWebhook(
    @Body() payload: ClerkWebhookDto,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      this.logger.log(`[WEBHOOK] Received Clerk webhook: ${payload.type} | ClerkId: ${payload.data?.id}`);
      
      // Verify webhook signature (implement proper verification)
      const verified = await this.webhooksService.verifyClerkWebhook(
        payload,
        svixId,
        svixTimestamp,
        svixSignature,
      );

      if (!verified) {
        this.logger.error('❌ [WEBHOOK] Invalid webhook signature!');
        return { success: false };
      }

      this.logger.log('✅ [WEBHOOK] Signature verified, processing event...');

      // Handle different webhook types
      await this.webhooksService.handleClerkEvent(payload);

      this.logger.log(`🎉 [WEBHOOK] Successfully processed Clerk webhook: ${payload.type}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`[WEBHOOK] Failed to process Clerk webhook: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  // Stripe webhooks are handled by BillingModule's WebhookController
  // which properly verifies Stripe signatures via constructEvent().
  // Do NOT add an unverified Stripe endpoint here.
}
