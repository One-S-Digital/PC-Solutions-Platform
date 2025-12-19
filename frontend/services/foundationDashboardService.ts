/**
 * Foundation Dashboard Service
 * Provides API calls for the foundation dashboard
 */

export interface FoundationQuickStats {
  enrolled: number;
  capacity: number;
  availableSpots: number;
  pendingApplications: number;
  upcomingAppointments: number;
  newLeads: number;
  trend: {
    enrolled: number;
    leads: number;
  };
}

export interface FoundationActivity {
  id: string;
  type: 'lead' | 'application' | 'order' | 'service' | 'message' | 'job';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  location?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  location: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// API endpoints
export const FOUNDATION_DASHBOARD_ENDPOINTS = {
  quickStats: '/dashboard/foundation/quick-stats',
  activities: '/dashboard/foundation/activities',
  calendar: '/dashboard/foundation/calendar',
  weather: '/dashboard/foundation/weather',
};

/**
 * Hook-compatible service functions
 * These should be called from within components using useAuthenticatedApi
 */

export const foundationDashboardApi = {
  /**
   * Get the endpoint for quick stats
   */
  getQuickStatsEndpoint: () => FOUNDATION_DASHBOARD_ENDPOINTS.quickStats,

  /**
   * Get the endpoint for activities
   */
  getActivitiesEndpoint: (limit?: number) =>
    limit
      ? `${FOUNDATION_DASHBOARD_ENDPOINTS.activities}?limit=${limit}`
      : FOUNDATION_DASHBOARD_ENDPOINTS.activities,

  /**
   * Get the endpoint for calendar events
   */
  getCalendarEndpoint: (date?: string) =>
    date
      ? `${FOUNDATION_DASHBOARD_ENDPOINTS.calendar}?date=${date}`
      : FOUNDATION_DASHBOARD_ENDPOINTS.calendar,

  /**
   * Get the endpoint for weather
   */
  getWeatherEndpoint: () => FOUNDATION_DASHBOARD_ENDPOINTS.weather,

  /**
   * Create calendar event - returns config for POST request
   */
  createCalendarEventConfig: (data: CreateCalendarEventData) => ({
    endpoint: FOUNDATION_DASHBOARD_ENDPOINTS.calendar,
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),

  /**
   * Delete calendar event - returns config for DELETE request
   */
  deleteCalendarEventConfig: (eventId: string) => ({
    endpoint: `${FOUNDATION_DASHBOARD_ENDPOINTS.calendar}/${eventId}`,
    method: 'DELETE' as const,
  }),
};

export default foundationDashboardApi;
