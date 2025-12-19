import { IsString, IsNumber, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateHealthCheckDto {
  @IsString()
  serviceName: string;

  @IsString()
  status: string; // healthy, degraded, down

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateSystemMetricsDto {
  @IsString()
  metricName: string;

  @IsNumber()
  metricValue: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateSystemAlertDto {
  @IsString()
  alertType: string; // error, warning, info

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  severity: string; // low, medium, high, critical

  @IsOptional()
  @IsObject()
  metadata?: any;
}