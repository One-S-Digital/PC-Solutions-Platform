import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class SendMailingCampaignDto {
  /**
   * If provided, will send ONLY to this email and not to the full list.
   * Useful for test sends.
   */
  @IsOptional()
  @IsEmail()
  testEmail?: string;

  /**
   * If true, computes recipients and writes delivery rows,
   * but does not actually send.
   */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

