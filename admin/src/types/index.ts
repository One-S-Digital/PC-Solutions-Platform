export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  INACTIVE = 'INACTIVE',
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ON_DEMAND = 'ON_DEMAND',
}

export enum ServiceCategory {
  Legal = 'Legal',
  Catering = 'Catering',
  Cleaning = 'Cleaning',
  Workshops = 'Workshops',
  IT_Support = 'IT_Support',
  Consulting = 'Consulting',
  Maintenance = 'Maintenance',
  Photography = 'Photography',
  Staff_Training = 'Staff_Training',
  Landscaping = 'Landscaping',
  Other = 'Other',
}

export enum ServiceDeliveryType {
  On_site = 'On_site',
  Remote = 'Remote',
  Hybrid = 'Hybrid',
}

export enum LeadMainStatus {
  NEW = 'NEW',
  PROCESSING = 'PROCESSING',
  PARENT_ACTION_REQUIRED = 'PARENT_ACTION_REQUIRED',
  CLOSED_ENROLLED = 'CLOSED_ENROLLED',
  CLOSED_OTHER = 'CLOSED_OTHER',
}

// Support Ticket Types
export type TicketCategory = 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketResponse {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  userName?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  responses: TicketResponse[];
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  assignee?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export interface CreateTicketData {
  subject: string;
  message: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
}