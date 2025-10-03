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
      this.logger.log(`Received Clerk webhook: ${payload.type}`);
      
      // Verify webhook signature (implement proper verification)
      const verified = await this.webhooksService.verifyClerkWebhook(
        payload,
        svixId,
        svixTimestamp,
        svixSignature,
      );

      if (!verified) {
        this.logger.error('Invalid web签名');
        return { success: false };
      }

      // Handle different webhook types
      await this.webhooksService.handleClerkEvent(payload);

      this.logger.log(`Successfully processed Clerk webhook: ${payload.type}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process Clerk webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(@Body() payload: any) {
    // Stripe webhook handling implementation
    this.logger.log('Received Stripe webhook');
    return { success: true };
  }
}
