
import React from 'react';
import Card from '../../components/ui/Card';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@workspace/translations';

const ParentSupportPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <QuestionMarkCircleIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('sidebar.supportFAQ')}
        </h1>
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('supportPage.faqTitle')}</h2>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-800">{t('parentSupportPage.faq.matchingProcess.q')}</h3>
            <p className="text-gray-600 text-sm">{t('parentSupportPage.faq.matchingProcess.a')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{t('parentSupportPage.faq.responseTime.q')}</h3>
            <p className="text-gray-600 text-sm">{t('parentSupportPage.faq.responseTime.a')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800">{t('parentSupportPage.faq.dataSecurity.q')}</h3>
            <p className="text-gray-600 text-sm">{t('parentSupportPage.faq.dataSecurity.a')}</p>
          </div>
          {/* Add more FAQs */}
        </div>
        <div className="mt-6 border-t pt-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('supportPage.furtherAssistanceTitle')}</h2>
            <p className="text-gray-600 text-sm">{t('supportPage.furtherAssistanceText.0')} <a href="mailto:support@procrechesolutions.com" className="text-swiss-mint hover:underline">{t('supportPage.furtherAssistanceText.1')}</a>.</p>
        </div>
      </Card>
    </div>
  );
};

export default ParentSupportPage;
