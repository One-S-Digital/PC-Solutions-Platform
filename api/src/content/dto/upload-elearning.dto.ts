import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ContentType {
  VIDEO = 'video',
  PDF = 'pdf',
  IMAGE = 'image',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export enum Language {
  EN = 'en',
  FR = 'fr',
  DE = 'de',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class UploadElearningDto {
  @ApiProperty({
    description: 'UUID of the course',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  courseId!: string;

  @ApiProperty({
    description: 'UUID of the course module',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  moduleId!: string;

  @ApiProperty({
    description: 'Title of the content',
    example: 'Introduction to Early Childhood Education',
  })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    description: 'Type of content',
    enum: ContentType,
    example: ContentType.PDF,
  })
  @IsEnum(ContentType)
  type!: ContentType;

  @ApiProperty({
    description: 'Description of the content',
    example: 'This document provides an overview of early childhood education principles',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Language of the content',
    enum: Language,
    example: Language.EN,
    required: false,
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDuration?: number;

  @ApiProperty({
    description: 'Difficulty level',
    enum: DifficultyLevel,
    example: DifficultyLevel.BEGINNER,
    required: false,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;
}
