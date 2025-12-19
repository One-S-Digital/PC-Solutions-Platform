import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ConversationType, MessageType } from '@workspace/types';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}