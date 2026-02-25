import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { SubscriptionTier, SubscriptionStatus, UserRole } from '@workspace/types';

/**
 * Create subscription DTO
 */
export class CreateSubscriptionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  planId: string;

  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(36)
  durationMonths?: number;

  @IsOptional()
  @IsBoolean()
  includeTrial?: boolean;

  @IsOptional()
  @IsDateString()
  trialStartDate?: string;

  @IsOptional()
  @IsDateString()
  trialEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Update subscription DTO
 */
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Activate subscription DTO
 */
export class ActivateSubscriptionDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(36)
  periodMonths?: number;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Pause subscription DTO
 */
export class PauseSubscriptionDto {
  @IsOptional()
  @IsDateString()
  pauseUntil?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  extendEndDate?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

/**
 * Resume subscription DTO
 */
export class ResumeSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  extendPeriod?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Cancel subscription DTO
 */
export class CancelSubscriptionDto {
  @IsBoolean()
  immediate: boolean;

  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Renew subscription DTO
 */
export class RenewSubscriptionDto {
  @IsNumber()
  @Min(1)
  @Max(36)
  periodMonths: number;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Extend subscription DTO
 */
export class ExtendSubscriptionDto {
  @IsNumber()
  @Min(1)
  @Max(365)
  additionalDays: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Upgrade/Downgrade subscription DTO
 */
export class UpgradeDowngradeDto {
  @IsString()
  newPlanId: string;

  @IsBoolean()
  immediate: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Schedule subscription action DTO
 */
export class ScheduleActionDto {
  @IsEnum(['ACTIVATE', 'CANCEL', 'PAUSE', 'RESUME', 'UPGRADE', 'DOWNGRADE'])
  action: 'ACTIVATE' | 'CANCEL' | 'PAUSE' | 'RESUME' | 'UPGRADE' | 'DOWNGRADE';

  @IsDateString()
  scheduledDate: string;

  @ValidateIf((o) => o.action === 'UPGRADE' || o.action === 'DOWNGRADE')
  @IsString()
  targetPlanId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Cancel scheduled action DTO
 */
export class CancelScheduleDto {
  @IsString()
  scheduleId: string;
}

/**
 * Add subscription note DTO
 */
export class AddNoteDto {
  @IsString()
  note: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

/**
 * Bulk subscription action DTO
 */
export class BulkSubscriptionActionDto {
  @IsArray()
  @IsString({ each: true })
  subscriptionIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  notifyCustomers?: boolean;
}

/**
 * Subscription list filters
 */
export class SubscriptionFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsBoolean()
  isManual?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  expiringBefore?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  /**
   * Filter subscriptions by role (derived from SubscriptionPlan.allowedRoles).
   * This is the primary way to segment subscriptions for Foundations vs Suppliers vs Service Providers.
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * Subscription plan DTOs
 */
export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  billingPeriod?: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsObject()
  limits: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @IsOptional()
  @IsString()
  stripeProductId?: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  billingPeriod?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsObject()
  limits?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @IsOptional()
  @IsString()
  stripeProductId?: string;
}
