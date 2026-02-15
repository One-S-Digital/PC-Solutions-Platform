import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MailingFiltersDto } from './mailing-filters.dto';

export class CreateSegmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => MailingFiltersDto)
  filters: MailingFiltersDto;
}

export class UpdateSegmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MailingFiltersDto)
  filters?: MailingFiltersDto;
}
