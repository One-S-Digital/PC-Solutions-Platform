import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answerId: string;
}

export class CreateQuizAttemptDto {
  @IsString()
  quizId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @IsOptional()
  @IsNumber()
  timeTaken?: number;
}