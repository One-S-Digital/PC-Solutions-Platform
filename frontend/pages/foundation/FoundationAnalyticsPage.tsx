import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  ArrowDownTrayIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import {
  foundationAnalyticsApi,
  AnalyticsOverview,
  SpendingData,
  LeadFunnelData,
  TrainingData,
  EnrollmentTrendData,
  downloadCsv,
  TimeRange,
  ExportType,
} from '../../services/foundationAnalyticsService';

const FoundationAnalyticsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { request } = useAuthenticatedApi();

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [exporting, setExporting] = useState<ExportType | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await request<AnalyticsOverview>(
        foundationAnalyticsApi.getOverviewEndpoint(timeRange)
      );

      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [request, timeRange, t]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle CSV export
  const handleExport = async (type: ExportType) => {
    setExporting(type);
    try {
      const res = await request<{ filename: string; contentType: string; content: string }>(
        foundationAnalyticsApi.getExportEndpoint(type, timeRange)
      );

      if (res.success && res.data) {
        downloadCsv(res.data);
      }
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(null);
    }
  };

  // Render spending chart (horizontal bar chart)
  const SpendingChart = ({ data }: { data: SpendingData[] }) => {
    const maxAmount = Math.max(...data.map(d => d.amount), 1);
    
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          {t('foundationAnalyticsPage.noSpendingData')}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.category} className="flex items-center">
            <div className="w-32 text-sm text-gray-600 truncate">{item.category}</div>
            <div className="flex-1 mx-3">
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(item.amount / maxAmount) * 100}%`,
                    backgroundColor: ['#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
                  }}
                />
              </div>
            </div>
            <div className="w-24 text-right text-sm font-medium">
              CHF {item.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render lead funnel
  const LeadFunnelChart = ({ data }: { data: LeadFunnelData[] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const colors = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];

    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          {t('foundationAnalyticsPage.noLeadData')}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map((stage, index) => (
          <div key={stage.stage} className="relative">
            <div 
              className="h-12 rounded-lg flex items-center justify-between px-4 text-white transition-all"
              style={{ 
                backgroundColor: colors[index % colors.length],
                width: `${Math.max(30, (stage.count / maxCount) * 100)}%`
              }}
            >
              <span className="text-sm font-medium truncate">{stage.stage}</span>
              <span className="text-sm font-bold">{stage.count}</span>
            </div>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-500 ml-2">
              {stage.conversionRate}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render training status chart
  const TrainingChart = ({ data }: { data: TrainingData[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <AcademicCapIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          {t('foundationAnalyticsPage.noTrainingData')}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.slice(0, 4).map((course) => (
          <div key={course.courseId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 truncate max-w-[200px]">{course.courseName}</span>
              <span className="text-gray-500">{course.completionRate}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(course.completedCount / Math.max(course.totalEnrolled, 1)) * 100}%` }}
              />
              <div 
                className="bg-yellow-400 h-full transition-all"
                style={{ width: `${(course.inProgressCount / Math.max(course.totalEnrolled, 1)) * 100}%` }}
              />
              <div 
                className="bg-gray-300 h-full transition-all"
                style={{ width: `${(course.notStartedCount / Math.max(course.totalEnrolled, 1)) * 100}%` }}
              />
            </div>
            <div className="flex text-xs text-gray-500 gap-4">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                {t('foundationAnalyticsPage.completed')}: {course.completedCount}
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />
                {t('foundationAnalyticsPage.inProgress')}: {course.inProgressCount}
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-1" />
                {t('foundationAnalyticsPage.notStarted')}: {course.notStartedCount}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render enrollment trend chart (simple line representation)
  const EnrollmentTrendChart = ({ data }: { data: EnrollmentTrendData[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <ArrowTrendingUpIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          {t('foundationAnalyticsPage.noEnrollmentData')}
        </div>
      );
    }

    const maxEnrolled = Math.max(...data.map(d => d.enrolled), 1);
    const maxLeads = Math.max(...data.map(d => d.newLeads), 1);

    return (
      <div className="h-64 flex items-end justify-between gap-1 px-2">
        {data.map((point) => (
          <div key={point.month} className="flex-1 flex flex-col items-center">
            <div className="w-full flex items-end justify-center gap-1 h-48">
              <div 
                className="w-4 bg-swiss-teal rounded-t transition-all hover:bg-swiss-teal/80"
                style={{ height: `${(point.enrolled / maxEnrolled) * 100}%` }}
                title={`${t('foundationAnalyticsPage.enrolled')}: ${point.enrolled}`}
              />
              <div 
                className="w-4 bg-swiss-mint rounded-t transition-all hover:bg-swiss-mint/80"
                style={{ height: `${(point.newLeads / maxLeads) * 100}%` }}
                title={`${t('foundationAnalyticsPage.newLeads')}: ${point.newLeads}`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 -rotate-45 origin-top-left">
              {point.monthLabel.substring(0, 3)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('foundationAnalyticsPage.title')}</h1>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('foundationAnalyticsPage.title')}</h1>
        <Card className="p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>{t('common:buttons.retry')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('foundationAnalyticsPage.title')}</h1>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
          >
            <option value="7d">{t('foundationAnalyticsPage.last7Days')}</option>
            <option value="30d">{t('foundationAnalyticsPage.last30Days')}</option>
            <option value="90d">{t('foundationAnalyticsPage.last90Days')}</option>
            <option value="6m">{t('foundationAnalyticsPage.last6Months')}</option>
            <option value="1y">{t('foundationAnalyticsPage.lastYear')}</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-swiss-teal/10 rounded-lg mr-4">
                <CurrencyDollarIcon className="w-6 h-6 text-swiss-teal" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('foundationAnalyticsPage.totalSpending')}</p>
                <p className="text-xl font-bold text-swiss-charcoal">
                  CHF {analytics.summary.totalSpending.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-swiss-mint/10 rounded-lg mr-4">
                <UserGroupIcon className="w-6 h-6 text-swiss-mint" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('foundationAnalyticsPage.totalLeads')}</p>
                <p className="text-xl font-bold text-swiss-charcoal">{analytics.summary.totalLeads}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-swiss-coral/10 rounded-lg mr-4">
                <ArrowTrendingUpIcon className="w-6 h-6 text-swiss-coral" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('foundationAnalyticsPage.conversionRate')}</p>
                <p className="text-xl font-bold text-swiss-charcoal">{analytics.summary.conversionRate}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-swiss-sand/20 rounded-lg mr-4">
                <AcademicCapIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('foundationAnalyticsPage.trainingCompletion')}</p>
                <p className="text-xl font-bold text-swiss-charcoal">{analytics.summary.trainingCompletionRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal">
              {t('foundationAnalyticsPage.spendingByCategory')}
            </h2>
            <Button 
              variant="ghost" 
              size="xs" 
              leftIcon={ArrowDownTrayIcon}
              onClick={() => handleExport('spending')}
              disabled={exporting === 'spending'}
            >
              {exporting === 'spending' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'CSV'}
            </Button>
          </div>
          <SpendingChart data={analytics?.spending || []} />
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal">
              {t('foundationAnalyticsPage.parentLeadConversion')}
            </h2>
            <Button 
              variant="ghost" 
              size="xs" 
              leftIcon={ArrowDownTrayIcon}
              onClick={() => handleExport('leads')}
              disabled={exporting === 'leads'}
            >
              {exporting === 'leads' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'CSV'}
            </Button>
          </div>
          <LeadFunnelChart data={analytics?.leadFunnel || []} />
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal">
              {t('foundationAnalyticsPage.staffTrainingCompletion')}
            </h2>
            <Button 
              variant="ghost" 
              size="xs" 
              leftIcon={ArrowDownTrayIcon}
              onClick={() => handleExport('training')}
              disabled={exporting === 'training'}
            >
              {exporting === 'training' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'CSV'}
            </Button>
          </div>
          <TrainingChart data={analytics?.training || []} />
        </Card>
      </div>

      {/* Enrollment trend - full width */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-swiss-charcoal">
            {t('foundationAnalyticsPage.enrollmentTrend')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 bg-swiss-teal rounded" />
              {t('foundationAnalyticsPage.enrolled')}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 bg-swiss-mint rounded" />
              {t('foundationAnalyticsPage.newLeads')}
            </div>
            <Button 
              variant="ghost" 
              size="xs" 
              leftIcon={ArrowDownTrayIcon}
              onClick={() => handleExport('enrollment')}
              disabled={exporting === 'enrollment'}
            >
              {exporting === 'enrollment' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'CSV'}
            </Button>
          </div>
        </div>
        <EnrollmentTrendChart data={analytics?.enrollmentTrend || []} />
      </Card>
    </div>
  );
};

export default FoundationAnalyticsPage;
