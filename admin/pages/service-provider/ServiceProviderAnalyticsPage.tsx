
import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowDownTrayIcon, ChartBarIcon, ChartPieIcon, PresentationChartLineIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { useTranslation } from 'react-i18next';

const ServiceProviderAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();

  const chartPlaceholder = (titleKey: string, type: string) => (
    <div className="bg-gray-50 p-6 rounded-lg shadow-inner h-64 flex flex-col items-center justify-center">
      <div className="text-gray-400 mb-2">
        {type === 'line' && <PresentationChartLineIcon className="h-12 w-12" />}
        {type === 'bar' && <ChartBarIcon className="h-12 w-12" />}
        {type === 'pie' && <ChartPieIcon className="h-12 w-12" />}
      </div>
      <p className="text-sm font-medium text-gray-600">{t(titleKey)}</p>
      <p className="text-xs text-gray-400">{t('supplierAnalyticsPage.mockChartText', { type })}</p>
    </div>
  );

  const promoData = [
    { code: 'NEWSERVICE15', uses: 30, revenueEst: 'CHF 450.00' },
    { code: 'CONSULTFREE', uses: 80, revenueEst: 'CHF 0.00 (Lead Gen)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('serviceProviderAnalyticsPage.title')}</h1>
        <div className="flex items-center space-x-2">
            <input type="date" className={`${STANDARD_INPUT_FIELD} w-auto`} defaultValue={new Date().toISOString().split('T')[0]} aria-label={t('supplierAnalyticsPage.datePickerLabel')} />
            <Button variant="outline" size="md" leftIcon={ArrowDownTrayIcon} onClick={() => alert(t('supplierAnalyticsPage.exportCsvAlert'))}>
                {t('supplierAnalyticsPage.exportCsvButton')}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('serviceProviderAnalyticsPage.serviceRequestsPerWeek')}</h2>
          {chartPlaceholder('serviceProviderAnalyticsPage.serviceRequestsTrend', 'line')}
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('serviceProviderAnalyticsPage.topViewedServices')}</h2>
          {chartPlaceholder('serviceProviderAnalyticsPage.serviceViews', 'bar')}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3">{t('serviceProviderAnalyticsPage.requestsByCanton')}</h2>
          {chartPlaceholder('serviceProviderAnalyticsPage.requestDistributionByCanton', 'pie')}
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-3 flex items-center">
             <TableCellsIcon className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('supplierAnalyticsPage.promoCodePerformance')}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierAnalyticsPage.table.code')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierAnalyticsPage.table.uses')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('supplierAnalyticsPage.table.estRevenueImpact')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoData.map(promo => (
                  <tr key={promo.code}>
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-swiss-charcoal">{promo.code}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{promo.uses}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{promo.revenueEst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ServiceProviderAnalyticsPage;
