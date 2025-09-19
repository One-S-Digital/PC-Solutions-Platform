import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ContentType } from '@repo/types';

export class CreateCourseLessonDto {
  @IsString()
  moduleId: string;

  @IsString()
  title: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  contentUrl?: string;

  @IsOptional()
  @IsString()
  contentText?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}