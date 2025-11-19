import { IsBoolean } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @IsBoolean()
  hidePubliclyToggle: boolean;

  @IsBoolean()
  gdprDataDeletionRequestMade: boolean;
}
