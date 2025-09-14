import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  lessonId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @IsOptional()
  @IsNumber()
  timeLimit?: number;

  @IsOptional()
  @IsNumber()
  attemptsAllowed?: number;
}