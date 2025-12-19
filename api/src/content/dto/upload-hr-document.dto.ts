import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum HRCategory {
  PROCEDURE = 'HR_PROCEDURE',
  POLICY = 'HR_POLICY',
  HANDBOOK = 'HANDBOOK',
  TRAINING = 'TRAINING',
  FORM = 'FORM',
}

export class UploadHrDocumentDto {
  @ApiProperty({
    description: 'Title of the HR document',
    example: 'Employee Onboarding Procedure',
  })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    description: 'Category of HR document',
    enum: HRCategory,
    example: HRCategory.PROCEDURE,
  })
  @IsEnum(HRCategory)
  category!: HRCategory;

  @ApiProperty({
    description: 'Description of the document',
    example: 'Step-by-step guide for onboarding new employees',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Department this document applies to',
    example: 'Human Resources',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
