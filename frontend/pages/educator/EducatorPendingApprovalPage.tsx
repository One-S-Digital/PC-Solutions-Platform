import React from 'react';
import { ClockIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EducatorPendingApprovalPage: React.FC = () => {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <div className="min-h-screen bg-page-bg flex items-start justify-center pt-8 px-4 pb-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <ClockIcon className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {t('educatorProfilePage.pendingApproval.title')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('educatorProfilePage.pendingApproval.description')}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-sm font-medium text-amber-800">
            {t('educatorProfilePage.pendingApproval.whatHappensNext')}
          </p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>{t('educatorProfilePage.pendingApproval.step1')}</li>
            <li>{t('educatorProfilePage.pendingApproval.step2')}</li>
            <li>{t('educatorProfilePage.pendingApproval.step3')}</li>
          </ul>
        </div>

        <div className="bg-swiss-mint/10 border border-swiss-mint/30 rounded-xl p-5 mb-8 text-left">
          <div className="flex items-start gap-3">
            <UserCircleIcon className="w-5 h-5 text-swiss-mint mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-swiss-charcoal mb-1">
                {t('educatorProfilePage.pendingApproval.completeProfileTitle')}
              </p>
              <p className="text-sm text-gray-600 mb-3">
                {t('educatorProfilePage.pendingApproval.completeProfileDescription')}
              </p>
              <button
                onClick={() => navigate('/educator/profile')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-swiss-mint text-white text-sm font-medium hover:bg-opacity-90 transition-colors"
              >
                <UserCircleIcon className="w-4 h-4" />
                {t('educatorProfilePage.goToMyProfile')}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@procreche.ch"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <EnvelopeIcon className="w-4 h-4" />
            {t('educatorProfilePage.pendingApproval.contactSupport')}
          </a>
          <button
            onClick={() => signOut().catch((err) => console.error('Sign out failed:', err))}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('educatorProfilePage.pendingApproval.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducatorPendingApprovalPage;
