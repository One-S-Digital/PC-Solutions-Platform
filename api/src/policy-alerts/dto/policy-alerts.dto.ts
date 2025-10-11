import { IsString, IsArray, IsBoolean, IsOptional, IsDateString, IsIn } from 'class-validator';

export enum AlertType {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export class CreatePolicyAlertDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsIn(Object.values(AlertType))
  @IsString()
  alertType: AlertType;

  @IsArray()
  @IsString({ each: true })
  regions: string[]; // Array of region codes (CH, DE, FR, etc.)

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  createdBy: string;
}

export class UpdatePolicyAlertDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsIn(Object.values(AlertType))
  @IsString()
  alertType?: AlertType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}