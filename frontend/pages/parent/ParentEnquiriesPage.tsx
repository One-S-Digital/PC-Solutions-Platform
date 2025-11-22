

import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ParentLead, LeadMainStatus, FoundationLeadResponseStatus, UserRole } from '../../types';
import Card from '../../components/ui/Card';
import { ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon, InformationCircleIcon, InboxIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const ParentEnquiriesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser, leads } = useAppContext();

  if (!currentUser || currentUser.role !== UserRole.PARENT) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-swiss-charcoal">{t('parentEnquiriesPage.accessDenied.title')}</h1>
        <p className="text-gray-600">{t('parentEnquiriesPage.accessDenied.message')}</p>
      </div>
    );
  }

  const myLeads = leads.filter(lead => lead.parentId === currentUser.id);

  const getStatusColor = (status: LeadMainStatus) => {
    switch (status) {
      case LeadMainStatus.NEW: return 'bg-blue-100 text-blue-700';
      case LeadMainStatus.PROCESSING: return 'bg-yellow-100 text-yellow-700';
      case LeadMainStatus.PARENT_ACTION_REQUIRED: return 'bg-orange-100 text-orange-700';
      case LeadMainStatus.CLOSED_ENROLLED: return 'bg-green-100 text-green-700';
      case LeadMainStatus.CLOSED_OTHER: return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getFoundationResponseStatusInfo = (status: FoundationLeadResponseStatus) => {
    switch(status) {
        case FoundationLeadResponseStatus.INTERESTED: return { text: t('leadCard.status.interested'), color: "text-green-600"};
        case FoundationLeadResponseStatus.NOT_INTERESTED: return { text: t('leadCard.status.notInterested'), color: "text-red-600"};
        case FoundationLeadResponseStatus.NEEDS_MORE_INFO: return { text: t('leadCard.status.needsMoreInfo'), color: "text-orange-600"};
        case FoundationLeadResponseStatus.ENROLLED: return { text: t('leadCard.status.enrolled'), color: "text-purple-600"};
        default: return { text: t('leadCard.status.notResponded'), color: "text-gray-500"};
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('parentEnquiriesPage.title')}
        </h1>
      </div>

      {myLeads.length === 0 && (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('parentEnquiriesPage.emptyState.title')}</h2>
          <p className="text-gray-500">{t('parentEnquiriesPage.emptyState.message.0')} <a href="/#/parent-lead-form" className="text-swiss-mint hover:underline">{t('parentEnquiriesPage.emptyState.message.1')}</a></p>
        </Card>
      )}

      {myLeads.map((lead) => (
        <Card key={lead.id} className="p-5 hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row justify-between md:items-start">
            <div>
              <h2 className="text-xl font-semibold text-swiss-teal mb-1">
                {t('parentEnquiriesPage.card.title', { canton: lead.canton, municipality: lead.municipality ? `- ${lead.municipality}` : ''})}
              </h2>
              <p className="text-sm text-gray-500">{t('parentEnquiriesPage.card.submitted')}: {new Date(lead.submissionDate).toLocaleDateString(i18n.language)}</p>
              <p className="text-sm text-gray-500">{t('parentEnquiriesPage.card.childInfo', { age: lead.childAge, date: new Date(lead.desiredStartDate).toLocaleDateString(i18n.language)})}</p>
            </div>
            <div className={`mt-2 md:mt-0 px-3 py-1 text-sm font-medium rounded-full inline-block ${getStatusColor(lead.mainStatus)}`}>
              {lead.mainStatus}
            </div>
          </div>

          {lead.specialNeeds && (
            <p className="text-sm text-gray-600 mt-2"><InformationCircleIcon className="w-4 h-4 inline mr-1 text-gray-400" />{t('parentEnquiriesPage.card.notes')}: {lead.specialNeeds}</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-md font-semibold text-swiss-charcoal mb-2">{t('parentEnquiriesPage.card.responsesTitle')}:</h3>
            {lead.responses.length === 0 && lead.mainStatus === LeadMainStatus.NEW && (
                <p className="text-sm text-gray-500">{t('parentEnquiriesPage.card.awaitingMatch')}</p>
            )}
            {lead.responses.map(response => {
                const statusInfo = getFoundationResponseStatusInfo(response.status);
                return (
                    <div key={response.foundationId} className="p-3 mb-2 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-swiss-charcoal">{response.foundationName}</p>
                            <p className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.text}</p>
                        </div>
                        {response.messageToParent && <p className="text-xs text-gray-600 mt-1 italic">{t('parentEnquiriesPage.card.message')}: {response.messageToParent}</p>}
                    </div>
                );
            })}
             {lead.assignedFoundations.length > 0 && lead.responses.length < lead.assignedFoundations.length && lead.mainStatus !== LeadMainStatus.CLOSED_ENROLLED && lead.mainStatus !== LeadMainStatus.CLOSED_OTHER && (
                <p className="text-sm text-gray-500 mt-2">{t('parentEnquiriesPage.card.waitingForMoreResponses')}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ParentEnquiriesPage;
