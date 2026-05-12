import React from 'react';
import { XCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useClerk } from '@clerk/clerk-react';
import { useAppContext } from '../../contexts/AppContext';

const EducatorRejectedPage: React.FC = () => {
  const { signOut } = useClerk();
  const { currentUser } = useAppContext();

  const rejectionNotes = currentUser?.approvalNotes;

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircleIcon className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Application Not Approved
        </h1>
        <p className="text-gray-600 mb-6">
          Unfortunately, your educator application was not approved at this time.
          Please review the reason below and contact our support team if you have questions.
        </p>

        {rejectionNotes && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-red-800 mb-1">Reason provided by our team:</p>
            <p className="text-sm text-red-700">{rejectionNotes}</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@procreche.ch"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-swiss-mint text-white text-sm font-medium hover:bg-swiss-mint/90 transition-colors"
          >
            <EnvelopeIcon className="w-4 h-4" />
            Contact Support
          </a>
          <button
            onClick={() => signOut().catch((err) => console.error('Sign out failed:', err))}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducatorRejectedPage;
