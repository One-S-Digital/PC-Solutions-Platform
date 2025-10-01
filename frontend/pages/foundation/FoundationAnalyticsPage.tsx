import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowDownTrayIcon, ChartBarIcon, PresentationChartLineIcon, CurrencyDollarIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { useTranslation } from 'react-i18next';

const FoundationAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const chartPlaceholder = (titleKey: string, type: string = 'bar', icon?: React.ElementType) => {
    const Icon = icon || (type === 'line' ? PresentationChartLineIcon : type === 'currency' ? CurrencyDollarIcon : type === 'users' ? UserGroupIcon : type === 'edu' ? AcademicCapIcon : ChartBarIcon);
    return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner h-64 flex flex-col items-center justify-center">
      <div className="text-gray-400 mb-2">
        <Icon className="h-12 w-12" />
      </div>
      <p className="text-sm font-medium text-gray-600">{t(titleKey)}</p>
      <p className="text-xs text-gray-400">{t('foundationAnalyticsPage.mockDataVisualization')}</p>
    </div>
  )};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('foundationAnalyticsPage.title')}</h1>
        <div className="flex items-center space-x-2">
            <input type="date" className={`${STANDARD_INPUT_FIELD} w-auto`} defaultValue={new Date().toISOString().split('T')[0]} aria-label={t('supplierAnalyticsPage.datePickerLabel')}/>
            <Button variant="outline" size="md" leftIcon={ArrowDownTrayIcon} onClick={() => alert(t('supplierAnalyticsPage.exportCsvAlert'))}>
                {t('supplierAnalyticsPage.exportCsvButton')}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('foundationAnalyticsPage.spendingByCategory')}</h2>
          {chartPlaceholder('foundationAnalyticsPage.spendingByCategory', 'currency', CurrencyDollarIcon)}
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('foundationAnalyticsPage.parentLeadConversion')}</h2>
          {chartPlaceholder('foundationAnalyticsPage.leadFunnel', 'users', UserGroupIcon)}
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('foundationAnalyticsPage.staffTrainingCompletion')}</h2>
          {chartPlaceholder('foundationAnalyticsPage.trainingStatus', 'edu', AcademicCapIcon)}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('foundationAnalyticsPage.enrollmentTrend')}</h2>
        {chartPlaceholder('foundationAnalyticsPage.monthlyEnrollment', 'line')}
      </Card>
    </div>
  );
};

export default FoundationAnalyticsPage;
