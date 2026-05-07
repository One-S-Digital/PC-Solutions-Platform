import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export enum CompensationType {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  STIPEND = 'STIPEND',
}

export class CreateInternPoolRequestDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  supervisorName?: string;

  @IsOptional()
  @IsEnum(CompensationType)
  compensationType?: CompensationType;

  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyHours?: number;
}
