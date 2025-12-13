
import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { QuestionMarkCircleIcon, LifebuoyIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import FoundationSupportPage from '../foundation/FoundationSupportPage';

interface FAQItemProps {
  questionKey: string;
  answerKey: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ questionKey, answerKey }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left"
      >
        <h3 className="text-md font-medium text-swiss-charcoal">{t(`dashboard:${questionKey}`)}</h3>
        {isOpen ? <ChevronUpIcon className="w-5 h-5 text-swiss-teal" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{t(`dashboard:${answerKey}`)}</p>}
    </div>
  );
};

const ServiceProviderSupportPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const faqs = [
    { questionKey: "serviceProviderSupportPage.faq.listService.q", answerKey: "serviceProviderSupportPage.faq.listService.a" },
    { questionKey: "serviceProviderSupportPage.faq.respondRequests.q", answerKey: "serviceProviderSupportPage.faq.respondRequests.a" },
    { questionKey: "serviceProviderSupportPage.faq.updateAvailability.q", answerKey: "serviceProviderSupportPage.faq.updateAvailability.a" },
    { questionKey: "serviceProviderSupportPage.faq.profileInfo.q", answerKey: "serviceProviderSupportPage.faq.profileInfo.a" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <LifebuoyIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('dashboard:sidebar.support')}
      </h1>

      <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-swiss-teal" />
            {t('common:supportPage.faqTitle')}
        </h2>
        {faqs.map(faq => <FAQItem key={faq.questionKey} questionKey={faq.questionKey} answerKey={faq.answerKey} />)}
           <div className="mt-6 border-t pt-6">
              <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('common:supportPage.furtherAssistanceTitle')}</h2>
              <p className="text-gray-600 text-sm">
                {t('common:supportPage.furtherAssistanceText')}{' '}
                <a href="mailto:support@procrechesolutions.com" className="text-swiss-mint hover:underline">
                  {t('common:supportPage.emailLinkText')}
                </a>{' '}
                {t('common:supportPage.orSubmitTicket')}
              </p>
        </div>
      </Card>

      {/* Full ticket experience */}
      <FoundationSupportPage />
    </div>
  );
};

export default ServiceProviderSupportPage;
