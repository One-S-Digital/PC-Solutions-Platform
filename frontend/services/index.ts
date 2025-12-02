// Export all services
export { apiService, ApiService } from './api';
export { userService, UserService } from './userService';
export { organizationService, OrganizationService } from './organizationService';
export { marketplaceService, MarketplaceService } from './marketplaceService';
export { messagingService, MessagingService } from './messagingService';
export { leadsService } from './leadsService';

// Foundation-specific services
export { foundationDashboardApi } from './foundationDashboardService';
export { foundationAnalyticsApi, downloadCsv } from './foundationAnalyticsService';
export { foundationOrdersApi, getOrderStatusClass, getServiceStatusClass } from './foundationOrdersService';
export { foundationLeadsApi, getLeadStatusInfo, getResponseStatusInfo } from './foundationLeadsService';
export { 
  supportApi, 
  getTicketStatusClass, 
  getTicketPriorityClass,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from './supportService';

// Export types
export type { ApiResponse, ApiError } from './api';
export type { UserUpdateData, UserCreateData } from './userService';
export type { OrganizationCreateData, OrganizationUpdateData } from './organizationService';
export type { ProductCreateData, ProductUpdateData, ServiceCreateData, ServiceUpdateData } from './marketplaceService';
export type { ConversationCreateData, MessageCreateData, ConversationParticipant } from './messagingService';
export type { ParentLeadCreateData, FoundationResponseCreateData, ParentLeadUpdateData } from './leadsService';

// Foundation service types
export type {
  FoundationQuickStats,
  FoundationActivity,
  CalendarEvent,
  WeatherData,
  CreateCalendarEventData,
} from './foundationDashboardService';
export type {
  SpendingData,
  LeadFunnelData,
  TrainingData,
  EnrollmentTrendData,
  AnalyticsOverview,
  TimeRange,
  EnrollmentTimeRange,
  ExportType,
  CsvExportData,
} from './foundationAnalyticsService';
export type {
  Order,
  OrderItem,
  ServiceAppointment,
  OrderStatus,
  ServiceRequestStatus,
} from './foundationOrdersService';
export type {
  LeadWithResponses,
  LeadResponseStats,
  CreateLeadResponseData,
  LeadResponseStatus,
} from './foundationLeadsService';
export type {
  SupportTicket,
  TicketResponse,
  CreateTicketData,
  CreateTicketResponseData,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './supportService';
