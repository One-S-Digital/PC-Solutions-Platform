import { Module } from '@nestjs/common';
import { SignupProfileService } from './signup-profile.service';

/**
 * Standalone module so both account-creation paths can share the applier:
 * the Clerk webhook (WebhooksModule) and POST /users/complete-profile
 * (UsersModule). The service is stateless and receives its transaction client
 * per call, so it has no module dependencies of its own.
 */
@Module({
  providers: [SignupProfileService],
  exports: [SignupProfileService],
})
export class SignupProfileModule {}
