import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { VendorClientReason } from '@prisma/client';

export class UpsertVendorClientDto {
  @IsUUID()
  vendorId!: string;

  @IsUUID()
  orgId!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsEnum(VendorClientReason)
  reason?: VendorClientReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class VendorClientFiltersDto {
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(VendorClientReason)
  reason?: VendorClientReason;
}

