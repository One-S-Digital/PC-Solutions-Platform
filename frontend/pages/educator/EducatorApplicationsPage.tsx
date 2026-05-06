import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ClipboardDocumentListIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { Application, ApplicationStatus } from '../../types';

const ApplicationDetailModal: React.FC<{ app: Application; onClose: () => void }> = ({ app, onClose }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card shadow-xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-swiss-charcoal">{app.jobTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {app.foundationName && (
          <p className="text-sm text-gray-500">{app.foundationName}</p>
        )}
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">{t('educatorApplicationsPage.table.status')}:</span>{' '}
            {app.status}
          </p>
          <p>
            <span className="font-medium">{t('educatorApplicationsPage.table.lastUpdated')}:</span>{' '}
            {new Date(app.updatedAt || app.createdAt).toLocaleDateString(i18n.language)}
          </p>
        </div>
        {app.coverLetter && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {t('educatorApplicationsPage.detail.coverLetter', 'Cover letter')}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{app.coverLetter}</p>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common:buttons.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const EducatorApplicationsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { applications } = useAppContext();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const getStatusInfo = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING: return { className: 'bg-swiss-sand/30 text-amber-800', label: t('educatorApplicationsPage.status.pending') };
      case ApplicationStatus.REVIEWED: return { className: 'bg-blue-100 text-blue-800', label: t('educatorApplicationsPage.status.reviewed') };
      case ApplicationStatus.ACCEPTED: return { className: 'bg-swiss-mint text-white', label: t('educatorApplicationsPage.status.accepted') };
      case ApplicationStatus.REJECTED: return { className: 'bg-swiss-coral/20 text-swiss-coral', label: t('educatorApplicationsPage.status.rejected') };
      default: return { className: 'bg-gray-100 text-gray-700', label: status };
    }
  };

  return (
    <div className="space-y-6">
      {selectedApp && (
        <ApplicationDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
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
                {applications.map((app) => {
                const statusInfo = getStatusInfo(app.status);
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-swiss-charcoal">{app.jobTitle}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{app.foundationName ?? t('educatorApplicationsPage.unknownFoundation', 'N/A')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(app.updatedAt || app.createdAt).toLocaleDateString(i18n.language)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => setSelectedApp(app)}>
                        {t('common:buttons.viewDetails')}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          {applications.length === 0 && <p className="text-center text-gray-500 py-8">{t('educatorApplicationsPage.emptyState')}</p>}
      </Card>
      <p className="text-xs text-gray-500 text-center">{t('educatorApplicationsPage.footerNote')}</p>
    </div>
  );
};

export default EducatorApplicationsPage;