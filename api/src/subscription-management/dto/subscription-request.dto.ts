import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  IsEmail,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { SubscriptionTier } from '@workspace/types';

/**
 * Subscription Request Status Enum (matches Prisma enum)
 */
export enum SubscriptionRequestStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVOICE_SENT = 'INVOICE_SENT',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  ACTIVATED = 'ACTIVATED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

/**
 * Create subscription request DTO (user-facing)
 */
export class CreateSubscriptionRequestDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @IsOptional()
  @IsString()
  billingPeriod?: string; // monthly, quarterly, yearly

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  preferredContact?: 'email' | 'phone';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

/**
 * Subscription request filters (admin)
 */
export class SubscriptionRequestFiltersDto {
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
  @IsEnum(SubscriptionRequestStatus)
  status?: SubscriptionRequestStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

/**
 * Review subscription request DTO
 */
export class ReviewSubscriptionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

/**
 * Send invoice for subscription request DTO
 */
export class SendInvoiceDto {
  @IsString()
  invoiceNumber: string;

  @IsNumber()
  @Min(0)
  invoiceAmount: number;

  @IsOptional()
  @IsString()
  invoiceCurrency?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

/**
 * Confirm payment for subscription request DTO
 */
export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsBoolean()
  autoActivate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

/**
 * Activate subscription from request DTO
 */
export class ActivateFromRequestDto {
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
  includeTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

/**
 * Decline subscription request DTO
 */
export class DeclineSubscriptionRequestDto {
  @IsString()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

/**
 * Add note to subscription request DTO
 */
export class AddRequestNoteDto {
  @IsString()
  @MaxLength(2000)
  note: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

/**
 * Update subscription settings DTO
 */
export class UpdateSubscriptionSettingsDto {
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;

  @IsOptional()
  @IsBoolean()
  enableEmailNotifications?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(90)
  defaultTrialDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  defaultGracePeriodDays?: number;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  invoiceNextNumber?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  paymentTermsDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  estimatedResponseHours?: number;
}
