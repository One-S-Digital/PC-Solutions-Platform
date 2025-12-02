/**
 * Foundation Analytics Service
 * Provides API calls for the foundation analytics page
 */

export interface SpendingData {
  category: string;
  amount: number;
  percentage: number;
  orderCount: number;
}

export interface LeadFunnelData {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface TrainingData {
  courseId: string;
  courseName: string;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  totalEnrolled: number;
  completionRate: number;
}

export interface EnrollmentTrendData {
  month: string;
  monthLabel: string;
  enrolled: number;
  newLeads: number;
  converted: number;
}

export interface AnalyticsOverview {
  spending: SpendingData[];
  leadFunnel: LeadFunnelData[];
  training: TrainingData[];
  enrollmentTrend: EnrollmentTrendData[];
  summary: {
    totalSpending: number;
    totalLeads: number;
    conversionRate: number;
    trainingCompletionRate: number;
  };
}

export interface CsvExportData {
  filename: string;
  contentType: string;
  content: string;
}

export type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y';
export type EnrollmentTimeRange = '3m' | '6m' | '12m';
export type ExportType = 'spending' | 'leads' | 'training' | 'enrollment';

// API endpoints
export const FOUNDATION_ANALYTICS_ENDPOINTS = {
  spending: '/analytics/foundation/spending',
  leads: '/analytics/foundation/leads',
  training: '/analytics/foundation/training',
  enrollment: '/analytics/foundation/enrollment',
  overview: '/analytics/foundation/overview',
  export: '/analytics/foundation/export',
};

/**
 * Hook-compatible service functions
 */
export const foundationAnalyticsApi = {
  /**
   * Get spending analytics endpoint
   */
  getSpendingEndpoint: (timeRange: TimeRange = '30d') =>
    `${FOUNDATION_ANALYTICS_ENDPOINTS.spending}?timeRange=${timeRange}`,

  /**
   * Get lead funnel endpoint
   */
  getLeadFunnelEndpoint: (timeRange: TimeRange = '30d') =>
    `${FOUNDATION_ANALYTICS_ENDPOINTS.leads}?timeRange=${timeRange}`,

  /**
   * Get training analytics endpoint
   */
  getTrainingEndpoint: () => FOUNDATION_ANALYTICS_ENDPOINTS.training,

  /**
   * Get enrollment trend endpoint
   */
  getEnrollmentEndpoint: (timeRange: EnrollmentTimeRange = '12m') =>
    `${FOUNDATION_ANALYTICS_ENDPOINTS.enrollment}?timeRange=${timeRange}`,

  /**
   * Get overview analytics endpoint
   */
  getOverviewEndpoint: (timeRange: TimeRange = '30d') =>
    `${FOUNDATION_ANALYTICS_ENDPOINTS.overview}?timeRange=${timeRange}`,

  /**
   * Get export endpoint
   */
  getExportEndpoint: (type: ExportType, timeRange: TimeRange = '30d') =>
    `${FOUNDATION_ANALYTICS_ENDPOINTS.export}?type=${type}&timeRange=${timeRange}`,
};

/**
 * Helper to download CSV data
 */
export const downloadCsv = (data: CsvExportData) => {
  const blob = new Blob([data.content], { type: data.contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default foundationAnalyticsApi;
