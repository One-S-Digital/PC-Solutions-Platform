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
  ASSIGNED = 'ASSIGNED',
  PROCESSING = 'PROCESSING',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
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
  assignedTo?: string | null;
  responses: TicketResponse[];
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
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

// Re-export subscription types
export * from './subscription';