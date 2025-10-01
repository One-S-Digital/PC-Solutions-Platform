import { IsString, IsArray, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreatePolicyAlertDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  alertType: string; // info, warning, critical

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
  @IsString()
  alertType?: string;

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