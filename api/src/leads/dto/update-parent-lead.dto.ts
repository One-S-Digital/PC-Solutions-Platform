import { IsString, IsOptional, IsNumber, IsArray, IsEmail } from 'class-validator';

export class UpdateParentLeadDto {
  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  childName?: string;

  @IsOptional()
  @IsNumber()
  childAge?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  preferredLocation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsString()
  foundationId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;
}