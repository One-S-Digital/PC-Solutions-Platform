# UI Data Mapping Documentation

## Overview
This document maps the UI components and screens to their corresponding data sources, API endpoints, and data adapters in the web-client application.

## Data Flow Architecture

### 1. API Client Layer
- **Location**: `packages/api-client/`
- **Purpose**: Typed API client with Clerk authentication
- **Key Files**:
  - `src/client.ts` - Axios instance with auth interceptor
  - `src/auth.ts` - Authentication API calls
  - `src/users.ts` - User management API calls
  - `src/organizations.ts` - Organization API calls
  - `src/marketplace.ts` - Marketplace API calls
  - `src/recruitment.ts` - Recruitment API calls
  - `src/messaging.ts` - Messaging API calls
  - `src/settings.ts` - Settings API calls

### 2. Data Adapters Layer
- **Location**: `apps/web-client/src/adapters/`
- **Purpose**: Transform API DTOs to UI models
- **Key Files**:
  - `user.adapter.ts` - User data transformation
  - `organization.adapter.ts` - Organization data transformation
  - `product.adapter.ts` - Product data transformation
  - `service.adapter.ts` - Service data transformation

### 3. React Query Hooks
- **Location**: `apps/web-client/src/hooks/`
- **Purpose**: Data fetching and caching with React Query
- **Key Files**:
  - `useCurrentUser.ts` - Current user data
  - `useOrganizations.ts` - Organization data
  - `useProducts.ts` - Product data
  - `useServices.ts` - Service data

## Screen-to-Data Mapping

### Dashboard Page
- **File**: `apps/web-client/src/pages/DashboardPage.tsx`
- **Data Sources**:
  - Current user: `useCurrentUser()` hook
  - User role and organization info
- **API Endpoints**:
  - `GET /users/me` - Current user data
- **Data Flow**:
  1. `useCurrentUser()` calls `GET /users/me`
  2. User adapter transforms DTO to UI model
  3. Component renders user info and role-based content

### Marketplace Page
- **File**: `apps/web-client/src/pages/MarketplacePage.tsx`
- **Data Sources**:
  - Products: `useProducts()` hook
  - Services: `useServices()` hook
- **API Endpoints**:
  - `GET /products` - Product listings
  - `GET /services` - Service listings
- **Data Flow**:
  1. `useProducts()` and `useServices()` fetch data
  2. Product/service adapters transform DTOs
  3. Component renders searchable product/service grid
  4. Search and filtering handled client-side

### Recruitment Page
- **File**: `apps/web-client/src/pages/RecruitmentPage.tsx`
- **Data Sources**:
  - Organizations: `useOrganizations()` hook
- **API Endpoints**:
  - `GET /organizations` - Organization listings
- **Data Flow**:
  1. `useOrganizations()` fetches organization data
  2. Organization adapter transforms DTOs
  3. Component renders organization cards with job openings
  4. Role-based filtering for available positions

### Messages Page
- **File**: `apps/web-client/src/pages/MessagesPage.tsx`
- **Data Sources**:
  - Current user: `useCurrentUser()` hook
  - Mock conversation data (to be replaced with API)
- **API Endpoints**:
  - `GET /users/me` - Current user data
  - `GET /conversations` - User conversations (future)
  - `POST /messages` - Send message (future)
- **Data Flow**:
  1. `useCurrentUser()` gets user context
  2. Mock conversation data displayed
  3. Message sending placeholder (console.log)

### Settings Page
- **File**: `apps/web-client/src/pages/SettingsPage.tsx`
- **Data Sources**:
  - Current user: `useCurrentUser()` hook
- **API Endpoints**:
  - `GET /users/me` - Current user data
  - `PUT /users/me` - Update user profile (future)
  - `PUT /organizations/:id` - Update organization (future)
- **Data Flow**:
  1. `useCurrentUser()` fetches user and organization data
  2. Form fields populated with current values
  3. Edit mode toggles field states
  4. Save operations (placeholder)

### Pricing Page
- **File**: `apps/web-client/src/pages/PricingPage.tsx`
- **Data Sources**:
  - Static pricing data (local JSON)
- **API Endpoints**:
  - None (static data)
- **Data Flow**:
  1. Static pricing plans loaded from local data
  2. Role-based pricing tiers displayed
  3. i18n translations for pricing text

## Data Adapter Patterns

### User Adapter
```typescript
// Input: User DTO from API
interface UserDTO {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  organization?: OrganizationDTO
}

// Output: UI Model
interface UserModel {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  roleLabel: string
  organization?: OrganizationModel
}
```

### Organization Adapter
```typescript
// Input: Organization DTO from API
interface OrganizationDTO {
  id: string
  name: string
  type: string
  location: string
  size: number
  openPositions: number
  availableRoles: string[]
}

// Output: UI Model
interface OrganizationModel {
  id: string
  name: string
  type: string
  typeLabel: string
  location: string
  size: number
  sizeLabel: string
  openPositions: number
  availableRoles: string[]
}
```

### Product Adapter
```typescript
// Input: Product DTO from API
interface ProductDTO {
  id: string
  title: string
  description: string
  price: number
  currency: string
  supplierId: string
  supplierName: string
  stockStatus: string
  imageUrl?: string
}

// Output: UI Model
interface ProductModel {
  id: string
  title: string
  description: string
  price: number
  currency: string
  formattedPrice: string
  supplierName: string
  stockStatus: string
  stockStatusLabel: string
  stockStatusColor: 'green' | 'yellow' | 'red' | 'blue'
  imageUrl?: string
}
```

## Error Handling Patterns

### API Error Handling
- **Location**: `packages/api-client/src/client.ts`
- **Pattern**: Axios interceptor for 401 errors
- **Behavior**: Redirect to login on authentication failure

### React Query Error Handling
- **Pattern**: Error states in components
- **Behavior**: Display error messages, retry options
- **Example**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers
})

if (error) {
  return <div className="text-red-600">Failed to load data</div>
}
```

### Loading States
- **Pattern**: Loading spinners during data fetching
- **Component**: `LoadingSpinner.tsx`
- **Usage**: Displayed while `isLoading` is true

## Data Caching Strategy

### React Query Configuration
- **Stale Time**: 5 minutes for most queries
- **Cache Time**: 10 minutes
- **Refetch**: On window focus, network reconnection
- **Background Updates**: Enabled for real-time data

### Cache Keys
- **Pattern**: `[resource, params]`
- **Examples**:
  - `['users', 'me']` - Current user
  - `['organizations', { search: 'query' }]` - Filtered organizations
  - `['products', { limit: 20 }]` - Paginated products

## Future API Integration

### Planned Endpoints
- **Messaging**: `GET /conversations`, `POST /messages`
- **Settings**: `PUT /users/me`, `PUT /organizations/:id`
- **File Upload**: `POST /uploads`
- **Analytics**: `GET /analytics/dashboard`

### Data Migration Strategy
1. Replace mock data with API calls
2. Update adapters for real DTOs
3. Add proper error handling
4. Implement optimistic updates
5. Add real-time subscriptions

## Performance Considerations

### Data Fetching
- **Parallel Queries**: Use `useQueries` for multiple data sources
- **Lazy Loading**: Load data only when needed
- **Pagination**: Implement for large datasets
- **Search Debouncing**: Prevent excessive API calls

### Caching
- **Selective Updates**: Update only changed data
- **Background Sync**: Keep data fresh without blocking UI
- **Offline Support**: Cache critical data for offline use

## Testing Strategy

### Unit Tests
- **Adapters**: Test data transformation logic
- **Hooks**: Test data fetching and caching
- **Components**: Test with mock data

### Integration Tests
- **API Client**: Test with real API endpoints
- **Error Scenarios**: Test error handling
- **Loading States**: Test loading behavior

### E2E Tests
- **User Flows**: Test complete user journeys
- **Data Persistence**: Test data saving/loading
- **Error Recovery**: Test error scenarios

## Monitoring and Analytics

### Data Usage Tracking
- **API Call Monitoring**: Track endpoint usage
- **Error Rates**: Monitor API failures
- **Performance Metrics**: Track response times
- **User Behavior**: Track data access patterns

### Debugging Tools
- **React Query DevTools**: Inspect cache state
- **Network Tab**: Monitor API calls
- **Console Logging**: Debug data flow
- **Error Boundaries**: Catch and log errors

## Security Considerations

### Data Protection
- **Authentication**: Clerk JWT tokens
- **Authorization**: Role-based access control
- **Data Sanitization**: Clean user inputs
- **Sensitive Data**: Mask sensitive information

### API Security
- **HTTPS Only**: Secure data transmission
- **Token Refresh**: Automatic token renewal
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Server-side validation

## Conclusion

The UI data mapping follows a clear separation of concerns:
1. **API Client**: Handles HTTP communication and authentication
2. **Adapters**: Transform data between API and UI formats
3. **Hooks**: Manage data fetching, caching, and state
4. **Components**: Render UI based on data state

This architecture ensures:
- **Type Safety**: End-to-end TypeScript types
- **Performance**: Efficient data fetching and caching
- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated, testable components
- **Scalability**: Easy to add new data sources and screens