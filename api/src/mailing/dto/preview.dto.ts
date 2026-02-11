import { IsOptional, IsInt, Min, Max, IsString, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MailingFiltersDto } from './mailing-filters.dto';

export class PreviewRequestDto {
  @ValidateNested()
  @Type(() => MailingFiltersDto)
  filters: MailingFiltersDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @IsIn(['email', 'name', 'role', 'createdAt'])
  sort?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;
}
