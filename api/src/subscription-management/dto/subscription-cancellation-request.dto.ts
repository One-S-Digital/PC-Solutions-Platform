import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SubscriptionCancellationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export class CreateSubscriptionCancellationRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancellationRequestFiltersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn(Object.values(SubscriptionCancellationRequestStatus))
  status?: SubscriptionCancellationRequestStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class ProcessCancellationRequestDto {
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

