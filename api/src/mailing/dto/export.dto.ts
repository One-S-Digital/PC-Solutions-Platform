import { IsOptional, IsArray, IsString, IsIn, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MailingFiltersDto } from './mailing-filters.dto';

export class ExportRequestDto {
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

  @IsString()
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx';

  @IsArray()
  @IsString({ each: true })
  columns: string[];

  @IsOptional()
  @IsBoolean()
  deduplicateByEmail?: boolean;
}
