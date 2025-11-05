import { IsBoolean, IsIn, IsString } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  newRequestEmailToggle: boolean;

  @IsString()
  @IsIn(['Daily', 'Weekly', 'None'])
  digestRadio: 'Daily' | 'Weekly' | 'None';

  @IsBoolean()
  promoRedemptionAlertsToggle: boolean;
}
