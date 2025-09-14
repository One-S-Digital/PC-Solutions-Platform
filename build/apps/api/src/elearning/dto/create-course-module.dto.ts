import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString()
  courseId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}