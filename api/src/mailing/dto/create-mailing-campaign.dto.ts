import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMailingCampaignDto {
  @IsString()
  mailingListId!: string;

  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  replyTo?: string;
}

