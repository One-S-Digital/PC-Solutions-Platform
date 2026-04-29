import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { InviteUserDto } from './invite-user.dto';

export class BulkInviteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @Type(() => InviteUserDto)
  invitations: InviteUserDto[];
}
