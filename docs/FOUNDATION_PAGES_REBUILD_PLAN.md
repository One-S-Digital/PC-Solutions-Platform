# Foundation Pages Rebuild Plan

## Executive Summary

This document outlines the complete plan to rebuild all Foundation role pages to be fully functional and connected to the database/backend. The goal is to eliminate all mock data and placeholder content, replacing them with real API calls and database-driven data.

---

## Current State Analysis

### Pages to Rebuild (Excluding Marketplace)

| Page | Current State | Priority |
|------|--------------|----------|
| `FoundationDashboardPage.tsx` | 🔴 Heavy mock data (stats, activities, calendar, weather) | P1 - High |
| `FoundationLeadsPage.tsx` | 🟡 Uses context with empty mock arrays | P1 - High |
| `FoundationOrdersAppointmentsPage.tsx` | 🔴 Uses MOCK_ORDERS, MOCK_ORGANIZATIONS | P1 - High |
| `FoundationAnalyticsPage.tsx` | 🔴 100% placeholder charts | P2 - Medium |
| `FoundationSupportPage.tsx` | 🟡 Ticket submission is placeholder | P3 - Low |
| `FoundationOrganisationProfilePage.tsx` | ✅ Already uses real API calls | N/A |

### Existing Backend Infrastructure

| Module | Status | Endpoints Available |
|--------|--------|---------------------|
| Dashboard | ✅ Exists | `GET /dashboard/foundation/stats`, `GET /dashboard/foundation/activities` |
| Leads | ✅ Exists | Full CRUD for parent leads, matching, assignment |
| Marketplace | ✅ Exists | Orders, service requests, products, services |
| Analytics | ⚠️ Admin Only | Need foundation-specific analytics |
| Support | ❌ Missing | Need support ticket system |

---

## Phase 1: Backend Enhancements

### 1.1 Enhance Dashboard Controller (Priority: P1)

**File:** `api/src/dashboard/dashboard.controller.ts`

**New Endpoints Required:**

```typescript
// GET /dashboard/foundation/calendar
// Returns upcoming appointments, scheduled visits, interviews
@Get('foundation/calendar')
@Roles(UserRole.FOUNDATION)
async getFoundationCalendar(@Request() req) {
  // Return events from:
  // - ServiceRequest (scheduled services)
  // - JobApplication (interviews)
  // - Custom calendar events (new table needed)
}

// GET /dashboard/foundation/weather
// Returns weather data for foundation location
@Get('foundation/weather')  
@Roles(UserRole.FOUNDATION)
async getFoundationWeather(@Request() req) {
  // Integration with weather API based on organization region
  // Cache results for 30 minutes
}

// GET /dashboard/foundation/quick-stats
// Returns enrollment, capacity, pending items
@Get('foundation/quick-stats')
@Roles(UserRole.FOUNDATION)
async getFoundationQuickStats(@Request() req) {
  // Calculate from:
  // - Organization capacity
  // - Parent leads (enrolled/pending)
  // - Job applications (pending)
  // - Service requests (upcoming)
}
```

**Implementation Tasks:**
- [ ] Add calendar events table to schema
- [ ] Implement calendar endpoint
- [ ] Add weather service integration (OpenWeatherMap or similar)
- [ ] Enhance quick-stats with real calculations

---

### 1.2 Create Foundation Analytics Service (Priority: P2)

**New Files:**
- `api/src/analytics/foundation-analytics.controller.ts`
- `api/src/analytics/foundation-analytics.service.ts`

**Endpoints:**

```typescript
@Controller('analytics/foundation')
@UseGuards(RolesGuard)
@Roles(UserRole.FOUNDATION)
export class FoundationAnalyticsController {
  
  // GET /analytics/foundation/spending
  @Get('spending')
  async getSpendingAnalytics(@Request() req, @Query('timeRange') timeRange: string) {
    // Aggregate orders by category over time
  }

  // GET /analytics/foundation/leads
  @Get('leads')
  async getLeadAnalytics(@Request() req, @Query('timeRange') timeRange: string) {
    // Lead funnel: NEW -> ASSIGNED -> CONTACTED -> ENROLLED
  }

  // GET /analytics/foundation/training
  @Get('training')
  async getTrainingAnalytics(@Request() req, @Query('timeRange') timeRange: string) {
    // Staff e-learning completion rates
  }

  // GET /analytics/foundation/enrollment
  @Get('enrollment')
  async getEnrollmentTrend(@Request() req, @Query('timeRange') timeRange: string) {
    // Monthly enrollment trends
  }

  // GET /analytics/foundation/overview
  @Get('overview')
  async getAnalyticsOverview(@Request() req) {
    // Combined dashboard view
  }
}
```

---

### 1.3 Enhance Leads Service (Priority: P1)

**File:** `api/src/leads/leads.controller.ts`

**Enhancements Needed:**

```typescript
// GET /leads/parent-leads/foundation/:foundationId
// Get leads assigned to or matching a specific foundation
@Get('parent-leads/foundation/:foundationId')
@Roles(UserRole.FOUNDATION)
async getFoundationLeads(
  @Param('foundationId') foundationId: string,
  @Query('status') status?: string,
) {
  // Returns leads where:
  // - foundationId matches OR
  // - Lead is NEW and matches foundation criteria (location, language)
}

// POST /leads/parent-leads/:id/respond
// Foundation responds to a lead
@Post('parent-leads/:id/respond')
@Roles(UserRole.FOUNDATION)
async respondToLead(
  @Param('id') leadId: string,
  @Body() responseDto: LeadResponseDto,
  @Request() req,
) {
  // Update lead status and create response record
}
```

**New DTO:**
```typescript
export class LeadResponseDto {
  status: 'INTERESTED' | 'NOT_INTERESTED' | 'NEEDS_MORE_INFO' | 'ENROLLED';
  message?: string;
}
```

**Schema Changes:**
Add `FoundationLeadResponse` table to track individual foundation responses to leads:

```prisma
model FoundationLeadResponse {
  id            String   @id @default(uuid())
  leadId        String
  foundationId  String
  status        String   // INTERESTED, NOT_INTERESTED, NEEDS_MORE_INFO, ENROLLED
  message       String?
  respondedAt   DateTime @default(now())
  
  lead          ParentLead @relation(fields: [leadId], references: [id])
  
  @@unique([leadId, foundationId])
  @@map("foundation_lead_responses")
}
```

---

### 1.4 Create Support Ticket System (Priority: P3)

**New Files:**
- `api/src/support/support.module.ts`
- `api/src/support/support.controller.ts`
- `api/src/support/support.service.ts`
- `api/src/support/dto/create-ticket.dto.ts`

**Schema Addition:**
```prisma
model SupportTicket {
  id          String   @id @default(uuid())
  userId      String
  subject     String
  message     String   @db.Text
  category    String   // GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST
  priority    String   @default("MEDIUM") // LOW, MEDIUM, HIGH, URGENT
  status      String   @default("OPEN") // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  assignedTo  String?
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  responses   TicketResponse[]
  
  @@map("support_tickets")
}

model TicketResponse {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  message   String   @db.Text
  isStaff   Boolean  @default(false)
  createdAt DateTime @default(now())
  
  ticket    SupportTicket @relation(fields: [ticketId], references: [id])
  
  @@map("ticket_responses")
}
```

**Endpoints:**
```typescript
@Controller('support')
export class SupportController {
  @Post('tickets')
  createTicket(@Body() dto: CreateTicketDto, @Request() req)
  
  @Get('tickets')
  getMyTickets(@Request() req)
  
  @Get('tickets/:id')
  getTicketById(@Param('id') id: string)
  
  @Post('tickets/:id/respond')
  respondToTicket(@Param('id') id: string, @Body() dto: TicketResponseDto)
}
```

---

## Phase 2: Frontend Service Layer

### 2.1 Create Foundation Dashboard Service

**New File:** `frontend/services/foundationDashboardService.ts`

```typescript
import { api } from './api';

export interface FoundationQuickStats {
  enrolled: number;
  capacity: number;
  availableSpots: number;
  pendingApplications: number;
  upcomingAppointments: number;
  trend: {
    enrolled: number; // +/- change from last period
  };
}

export interface FoundationActivity {
  id: string;
  type: 'lead' | 'application' | 'order' | 'service' | 'message';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  actionUrl?: string;
}

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  type: 'appointment' | 'interview' | 'service' | 'custom';
  date: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}

export const foundationDashboardService = {
  async getQuickStats(): Promise<FoundationQuickStats> {
    const response = await api.get('/dashboard/foundation/quick-stats');
    return response.data;
  },

  async getActivities(limit = 10): Promise<FoundationActivity[]> {
    const response = await api.get('/dashboard/foundation/activities', { params: { limit } });
    return response.data;
  },

  async getCalendarEvents(date?: string): Promise<CalendarEvent[]> {
    const response = await api.get('/dashboard/foundation/calendar', { params: { date } });
    return response.data;
  },

  async getWeather(): Promise<WeatherData | null> {
    try {
      const response = await api.get('/dashboard/foundation/weather');
      return response.data;
    } catch {
      return null; // Weather is optional
    }
  },
};
```

---

### 2.2 Create Foundation Analytics Service

**New File:** `frontend/services/foundationAnalyticsService.ts`

```typescript
import { api } from './api';

export interface SpendingData {
  category: string;
  amount: number;
  percentage: number;
}

export interface LeadFunnelData {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface TrainingData {
  courseName: string;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
}

export interface EnrollmentTrendData {
  month: string;
  enrolled: number;
  capacity: number;
}

export interface AnalyticsOverview {
  spending: SpendingData[];
  leadFunnel: LeadFunnelData[];
  training: TrainingData[];
  enrollmentTrend: EnrollmentTrendData[];
}

export const foundationAnalyticsService = {
  async getSpendingByCategory(timeRange = '30d'): Promise<SpendingData[]> {
    const response = await api.get('/analytics/foundation/spending', { params: { timeRange } });
    return response.data;
  },

  async getLeadFunnel(timeRange = '30d'): Promise<LeadFunnelData[]> {
    const response = await api.get('/analytics/foundation/leads', { params: { timeRange } });
    return response.data;
  },

  async getTrainingStatus(): Promise<TrainingData[]> {
    const response = await api.get('/analytics/foundation/training');
    return response.data;
  },

  async getEnrollmentTrend(timeRange = '12m'): Promise<EnrollmentTrendData[]> {
    const response = await api.get('/analytics/foundation/enrollment', { params: { timeRange } });
    return response.data;
  },

  async getOverview(): Promise<AnalyticsOverview> {
    const response = await api.get('/analytics/foundation/overview');
    return response.data;
  },
};
```

---

### 2.3 Enhance Leads Service

**Update File:** `frontend/services/leadsService.ts`

```typescript
import { api } from './api';
import { ParentLead, FoundationLeadResponseStatus } from '../types';

export const leadsService = {
  async getFoundationLeads(foundationId: string, filters?: {
    status?: string;
    search?: string;
  }): Promise<ParentLead[]> {
    const response = await api.get(`/leads/parent-leads/foundation/${foundationId}`, {
      params: filters,
    });
    return response.data;
  },

  async respondToLead(leadId: string, response: {
    status: FoundationLeadResponseStatus;
    message?: string;
  }): Promise<void> {
    await api.post(`/leads/parent-leads/${leadId}/respond`, response);
  },

  async getLeadById(leadId: string): Promise<ParentLead> {
    const response = await api.get(`/leads/parent-leads/${leadId}`);
    return response.data;
  },
};
```

---

### 2.4 Enhance Orders Service

**New File:** `frontend/services/foundationOrdersService.ts`

```typescript
import { api } from './api';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  requestDate: string;
}

export interface ServiceAppointment {
  id: string;
  providerId: string;
  providerName: string;
  providerLogoUrl?: string;
  serviceName: string;
  status: string;
  requestedAt: string;
  scheduledAt?: string;
}

export const foundationOrdersService = {
  async getOrders(): Promise<Order[]> {
    const response = await api.get('/marketplace/orders');
    return response.data;
  },

  async cancelOrder(orderId: string): Promise<void> {
    await api.patch(`/marketplace/orders/${orderId}/status`, { status: 'CANCELLED' });
  },

  async getServiceAppointments(): Promise<ServiceAppointment[]> {
    const response = await api.get('/marketplace/service-requests');
    return response.data;
  },

  async rescheduleAppointment(requestId: string, newDate: string): Promise<void> {
    await api.patch(`/marketplace/service-requests/${requestId}`, { scheduledAt: newDate });
  },
};
```

---

### 2.5 Create Support Service

**New File:** `frontend/services/supportService.ts`

```typescript
import { api } from './api';

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  subject: string;
  message: string;
  category?: string;
}

export const supportService = {
  async createTicket(ticket: CreateTicketDto): Promise<SupportTicket> {
    const response = await api.post('/support/tickets', ticket);
    return response.data;
  },

  async getMyTickets(): Promise<SupportTicket[]> {
    const response = await api.get('/support/tickets');
    return response.data;
  },
};
```

---

## Phase 3: Frontend Page Rebuilds

### 3.1 FoundationDashboardPage.tsx

**Changes Required:**

1. **Remove all mock data constants**
2. **Add state management for API data**
3. **Implement data fetching with loading states**
4. **Add error handling**

**Key Code Changes:**

```tsx
// Before (mock data)
const quickStats = [
  { labelKey: 'foundationDashboard.quickStats.enrolled', value: '45 / 50', ... },
];

// After (real data)
const [quickStats, setQuickStats] = useState<FoundationQuickStats | null>(null);
const [activities, setActivities] = useState<FoundationActivity[]>([]);
const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
const [weather, setWeather] = useState<WeatherData | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [stats, activityData, events, weatherData] = await Promise.all([
        foundationDashboardService.getQuickStats(),
        foundationDashboardService.getActivities(),
        foundationDashboardService.getCalendarEvents(),
        foundationDashboardService.getWeather(),
      ]);
      setQuickStats(stats);
      setActivities(activityData);
      setCalendarEvents(events);
      setWeather(weatherData);
    } catch (err) {
      setError(t('common:errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchDashboardData();
}, []);
```

**Component Structure:**
- Add `LoadingSpinner` component for loading state
- Add error boundary/retry functionality
- Transform API data to match UI requirements

---

### 3.2 FoundationLeadsPage.tsx

**Changes Required:**

1. **Replace AppContext leads with API calls**
2. **Implement real-time response handling**
3. **Add filtering and pagination**

**Key Code Changes:**

```tsx
// Before (context)
const { leads, setLeads } = useAppContext();

// After (API)
const [leads, setLeads] = useState<ParentLead[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchLeads = async () => {
    if (!currentUser?.orgId) return;
    try {
      const data = await leadsService.getFoundationLeads(currentUser.orgId);
      setLeads(data);
    } catch (err) {
      addNotification({ type: 'error', message: t('foundationLeadsPage.loadError') });
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchLeads();
}, [currentUser?.orgId]);

const handleLeadResponse = async (leadId: string, status: FoundationLeadResponseStatus, message?: string) => {
  try {
    await leadsService.respondToLead(leadId, { status, message });
    // Refresh leads
    const updatedLeads = await leadsService.getFoundationLeads(currentUser!.orgId!);
    setLeads(updatedLeads);
    addNotification({ type: 'success', message: t('foundationLeadsPage.responseSuccess') });
  } catch (err) {
    addNotification({ type: 'error', message: t('foundationLeadsPage.responseError') });
  }
};
```

---

### 3.3 FoundationOrdersAppointmentsPage.tsx

**Changes Required:**

1. **Remove MOCK_ORDERS and MOCK_ORGANIZATIONS imports**
2. **Fetch real data from API**
3. **Implement order actions (cancel, message)**

**Key Code Changes:**

```tsx
// Before
import { MOCK_ORDERS, MOCK_ORGANIZATIONS } from '../../constants';
const productOrders = MOCK_ORDERS.filter(order => order.foundationOrgId === foundationOrgId);

// After
const [productOrders, setProductOrders] = useState<Order[]>([]);
const [serviceAppointments, setServiceAppointments] = useState<ServiceAppointment[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchOrdersAndAppointments = async () => {
    try {
      const [orders, appointments] = await Promise.all([
        foundationOrdersService.getOrders(),
        foundationOrdersService.getServiceAppointments(),
      ]);
      setProductOrders(orders);
      setServiceAppointments(appointments);
    } catch (err) {
      addNotification({ type: 'error', message: t('foundationOrdersAppointmentsPage.loadError') });
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchOrdersAndAppointments();
}, []);
```

---

### 3.4 FoundationAnalyticsPage.tsx

**Changes Required:**

1. **Replace placeholder charts with real chart components**
2. **Fetch analytics data from API**
3. **Add date range selector functionality**
4. **Implement chart library (recommend Recharts)**

**Key Code Changes:**

```tsx
// Before (placeholder)
const chartPlaceholder = (titleKey: string) => (
  <div className="...">
    <p className="...">{t('foundationAnalyticsPage.mockDataVisualization')}</p>
  </div>
);

// After (real charts)
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip } from 'recharts';

const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
const [enrollmentData, setEnrollmentData] = useState<EnrollmentTrendData[]>([]);
const [timeRange, setTimeRange] = useState<string>('30d');

useEffect(() => {
  const fetchAnalytics = async () => {
    const overview = await foundationAnalyticsService.getOverview();
    setSpendingData(overview.spending);
    setEnrollmentData(overview.enrollmentTrend);
    // ... other data
  };
  
  fetchAnalytics();
}, [timeRange]);

// Spending Chart Component
const SpendingChart = () => (
  <BarChart data={spendingData}>
    <XAxis dataKey="category" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="amount" fill="#10B981" />
  </BarChart>
);
```

**Install Recharts:**
```bash
pnpm add recharts
```

---

### 3.5 FoundationSupportPage.tsx

**Changes Required:**

1. **Implement real ticket submission**
2. **Add ticket history view**
3. **Show submission confirmation**

**Key Code Changes:**

```tsx
// Before
const handleTicketSubmit = (e: React.FormEvent) => {
  console.log("Support ticket submitted");
  alert(t('dashboard:foundationSupportPage.ticketSubmittedAlert'));
};

// After
const [isSubmitting, setIsSubmitting] = useState(false);
const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);

const handleTicketSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    await supportService.createTicket({
      subject: ticketSubject,
      message: ticketMessage,
      category: 'GENERAL',
    });
    
    addNotification({
      type: 'success',
      title: t('foundationSupportPage.ticketCreated'),
      message: t('foundationSupportPage.ticketCreatedMessage'),
    });
    
    setTicketSubject('');
    setTicketMessage('');
    
    // Refresh ticket list
    const tickets = await supportService.getMyTickets();
    setMyTickets(tickets);
  } catch (err) {
    addNotification({
      type: 'error',
      message: t('foundationSupportPage.ticketError'),
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Phase 4: Remove Mock Data Dependencies

### 4.1 Clean Up Constants

**File:** `frontend/constants.ts`

Remove or deprecate:
- `MOCK_ORDERS`
- `MOCK_ORGANIZATIONS`
- `MOCK_PARENT_LEADS`
- `MOCK_SERVICE_REQUESTS`

### 4.2 Update AppContext

**File:** `frontend/contexts/AppContext.tsx`

**Changes:**
1. Remove mock data initialization for leads
2. Remove mock data initialization for service requests
3. Add API-based data fetching where needed
4. Keep only global state that doesn't belong in individual pages

```tsx
// Remove these initializations
const [leads, setLeads] = useState<ParentLead[]>(MOCK_PARENT_LEADS);
const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(MOCK_SERVICE_REQUESTS);

// Replace with lazy loading or remove if page-specific
```

---

## Phase 5: Testing & Validation

### 5.1 API Integration Tests

**New Files:**
- `api/test/dashboard.e2e-spec.ts`
- `api/test/foundation-analytics.e2e-spec.ts`
- `api/test/leads.e2e-spec.ts`
- `api/test/support.e2e-spec.ts`

### 5.2 Frontend Component Tests

**New Files:**
- `frontend/tests/unit/FoundationDashboardPage.test.ts`
- `frontend/tests/unit/FoundationLeadsPage.test.ts`
- `frontend/tests/unit/FoundationOrdersAppointmentsPage.test.ts`
- `frontend/tests/unit/FoundationAnalyticsPage.test.ts`
- `frontend/tests/unit/FoundationSupportPage.test.ts`

### 5.3 E2E Tests

**Update Files:**
- `frontend/tests/e2e/foundation-dashboard.spec.ts`
- `frontend/tests/e2e/foundation-leads.spec.ts`

---

## Implementation Timeline

### Week 1: Backend Enhancements
- [ ] Day 1-2: Dashboard controller enhancements (calendar, weather, quick-stats)
- [ ] Day 3-4: Foundation analytics service and controller
- [ ] Day 5: Leads service enhancements (foundation responses)

### Week 2: Frontend Services & Dashboard
- [ ] Day 1: Create all frontend service files
- [ ] Day 2-3: Rebuild FoundationDashboardPage
- [ ] Day 4-5: Rebuild FoundationLeadsPage

### Week 3: Orders, Analytics & Support
- [ ] Day 1-2: Rebuild FoundationOrdersAppointmentsPage
- [ ] Day 3-4: Rebuild FoundationAnalyticsPage (with Recharts)
- [ ] Day 5: Support ticket system (backend + frontend)

### Week 4: Testing & Polish
- [ ] Day 1-2: Write API integration tests
- [ ] Day 3: Write frontend unit tests
- [ ] Day 4: E2E tests
- [ ] Day 5: Bug fixes and polish

---

## Database Migrations Required

### Migration 1: Foundation Lead Responses
```sql
CREATE TABLE "foundation_lead_responses" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "foundationId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "foundation_lead_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "foundation_lead_responses_leadId_fkey" 
    FOREIGN KEY ("leadId") REFERENCES "parent_leads"("id"),
  CONSTRAINT "foundation_lead_responses_unique" 
    UNIQUE ("leadId", "foundationId")
);
```

### Migration 2: Support Tickets
```sql
CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedTo" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_tickets_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE TABLE "ticket_responses" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isStaff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_responses_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id")
);
```

### Migration 3: Calendar Events
```sql
CREATE TABLE "calendar_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventType" TEXT NOT NULL, -- 'appointment', 'interview', 'service', 'custom'
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3),
  "relatedEntityType" TEXT, -- 'service_request', 'job_application', etc.
  "relatedEntityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_events_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
);
```

---

## Success Criteria

- [ ] All foundation pages load real data from the database
- [ ] No mock data constants are used in production code
- [ ] All API endpoints return proper error responses
- [ ] Loading states are shown during data fetching
- [ ] Error states are handled gracefully with retry options
- [ ] All existing functionality is preserved
- [ ] Performance: Pages load within 2 seconds
- [ ] Tests pass with >80% coverage
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `api/src/analytics/foundation-analytics.controller.ts` | Foundation-specific analytics endpoints |
| `api/src/analytics/foundation-analytics.service.ts` | Analytics business logic |
| `api/src/support/support.module.ts` | Support ticket module |
| `api/src/support/support.controller.ts` | Support ticket endpoints |
| `api/src/support/support.service.ts` | Support ticket business logic |
| `api/prisma/migrations/YYYYMMDD_foundation_lead_responses/` | Lead responses migration |
| `api/prisma/migrations/YYYYMMDD_support_tickets/` | Support tickets migration |
| `api/prisma/migrations/YYYYMMDD_calendar_events/` | Calendar events migration |
| `frontend/services/foundationDashboardService.ts` | Dashboard API service |
| `frontend/services/foundationAnalyticsService.ts` | Analytics API service |
| `frontend/services/foundationOrdersService.ts` | Orders API service |
| `frontend/services/supportService.ts` | Support ticket API service |

### Modified Files
| File | Changes |
|------|---------|
| `api/src/dashboard/dashboard.controller.ts` | Add calendar, weather, quick-stats endpoints |
| `api/src/leads/leads.controller.ts` | Add foundation-specific endpoints |
| `api/src/leads/leads.service.ts` | Add response handling |
| `api/prisma/schema.prisma` | Add new models |
| `frontend/pages/foundation/FoundationDashboardPage.tsx` | Full rebuild |
| `frontend/pages/foundation/FoundationLeadsPage.tsx` | API integration |
| `frontend/pages/foundation/FoundationOrdersAppointmentsPage.tsx` | API integration |
| `frontend/pages/foundation/FoundationAnalyticsPage.tsx` | Full rebuild with charts |
| `frontend/pages/foundation/FoundationSupportPage.tsx` | API integration |
| `frontend/constants.ts` | Remove mock data |
| `frontend/contexts/AppContext.tsx` | Remove mock data dependencies |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API breaking changes | Version API endpoints, maintain backward compatibility |
| Data migration issues | Test migrations in staging first, have rollback plan |
| Performance degradation | Implement caching, pagination, lazy loading |
| User experience disruption | Feature flag new implementations, gradual rollout |
| Missing edge cases | Comprehensive error handling, fallback UI states |

---

## Questions to Resolve

1. **Weather API**: Which weather service to integrate? (OpenWeatherMap, WeatherAPI.io, etc.)
2. **Chart Library**: Confirm Recharts as the charting solution
3. **Real-time Updates**: Should we implement WebSocket for live activity updates?
4. **Caching Strategy**: Redis caching for frequently accessed data?
5. **Notification System**: Integrate with existing email notification system?
