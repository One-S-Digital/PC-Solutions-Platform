import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsString()
  @IsOptional()
  @IsIn(['GENERAL', 'TECHNICAL', 'BILLING', 'FEATURE_REQUEST'])
  category?: 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';

  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export class CreateTicketResponseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;
}

export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

export interface SupportTicketResponse {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedTo?: string | null;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  responses: {
    id: string;
    message: string;
    isStaff: boolean;
    createdAt: string;
    userName?: string;
  }[];
}
