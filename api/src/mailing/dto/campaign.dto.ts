import { IsString, IsOptional, ValidateNested, IsInt, Min, Max, IsArray, IsEmail, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { MailingFiltersDto } from './mailing-filters.dto';

export class CreateCampaignDto {
  @IsString()
  subject: string;

  @IsString()
  bodyHtml: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MailingFiltersDto)
  filters?: MailingFiltersDto;

  @IsOptional()
  @IsString()
  segmentId?: string;

  @IsOptional()
  @IsString()
  customListId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsEmail({}, { each: true })
  extraEmails?: string[];
}

export class SendBatchDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  batchSize?: number;
}
