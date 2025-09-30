import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ClipboardDocumentListIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { Application, ApplicationStatus } from '../../types';

const EducatorApplicationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, applications } = useAppContext();

  const myApplications = applications.filter(app => app.educatorId === currentUser?.id);

  const getStatusInfo = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.NEW: return { className: 'bg-swiss-sand/30 text-amber-800', label: t('educatorApplicationsPage.status.new') };
      case ApplicationStatus.VIEWED: return { className: 'bg-blue-100 text-blue-800', label: t('educatorApplicationsPage.status.viewed') };
      case ApplicationStatus.INTERVIEW: return { className: 'bg-swiss-mint/20 text-swiss-mint border border-swiss-mint', label: t('educatorApplicationsPage.status.interview') };
      case ApplicationStatus.OFFER: return { className: 'bg-swiss-mint text-white', label: t('educatorApplicationsPage.status.offer') };
      case ApplicationStatus.DECLINED: return { className: 'bg-swiss-coral/20 text-swiss-coral', label: t('educatorApplicationsPage.status.declined') };
      default: return { className: 'bg-gray-100 text-gray-700', label: status };
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('educatorApplicationsPage.title')}
      </h1>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('educatorApplicationsPage.table.jobTitle')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('educatorApplicationsPage.table.creche')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('educatorApplicationsPage.table.status')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('educatorApplicationsPage.table.lastUpdated')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('educatorApplicationsPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {myApplications.map((app) => {
                const statusInfo = getStatusInfo(app.status);
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-charcoal">{app.jobTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{app.foundationName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(app.applicationDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => alert(`${t('educatorApplicationsPage.viewingDetailsFor')} ${app.jobTitle}`)}>
                        {t('buttons.viewDetails')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {myApplications.length === 0 && <p className="text-center text-gray-500 py-8">{t('educatorApplicationsPage.emptyState')}</p>}
      </Card>
      <p className="text-xs text-gray-500 text-center">{t('educatorApplicationsPage.footerNote')}</p>
    </div>
  );
};

export default EducatorApplicationsPage;