import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark routes that should be accessible to educators whose accounts
 * are pending admin approval (PENDING_REVIEW status). Used on profile setup
 * endpoints so educators can submit their profile before it is reviewed.
 */
export const ALLOW_PENDING_EDUCATOR_KEY = 'allowPendingEducator';
export const AllowPendingEducator = () => SetMetadata(ALLOW_PENDING_EDUCATOR_KEY, true);
