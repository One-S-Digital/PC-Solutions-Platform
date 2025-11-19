// Export all services
export { apiService, ApiService } from './api';
export { userService, UserService } from './userService';
export { organizationService, OrganizationService } from './organizationService';
export { marketplaceService, MarketplaceService } from './marketplaceService';
export { messagingService, MessagingService } from './messagingService';
export { leadsService, LeadsService } from './leadsService';

// Export types
export type { ApiResponse, ApiError } from './api';
export type { UserUpdateData, UserCreateData } from './userService';
export type { OrganizationCreateData, OrganizationUpdateData } from './organizationService';
export type { ProductCreateData, ProductUpdateData, ServiceCreateData, ServiceUpdateData } from './marketplaceService';
export type { ConversationCreateData, MessageCreateData, ConversationParticipant } from './messagingService';
export type { ParentLeadCreateData, FoundationResponseCreateData, ParentLeadUpdateData } from './leadsService';
