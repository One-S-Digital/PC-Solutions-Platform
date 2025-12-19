import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark routes that should be accessible to pending users
 * (users whose accounts are being created via webhook but not yet complete)
 */
export const ALLOW_PENDING_KEY = 'allowPending';
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
