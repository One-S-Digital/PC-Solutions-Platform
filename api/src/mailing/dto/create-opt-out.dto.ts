import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateOptOutDto {
  @IsEmail()
  email!: string;

  /**
   * 'GLOBAL' unsubscribes from all admin mailings.
   * 'LIST' unsubscribes only from a specific mailing list.
   */
  @IsString()
  scope!: 'GLOBAL' | 'LIST';

  @IsOptional()
  @IsString()
  mailingListId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

