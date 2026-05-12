import React from 'react';
import { ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useClerk } from '@clerk/clerk-react';

const EducatorPendingApprovalPage: React.FC = () => {
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <ClockIcon className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Profile Under Review
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for signing up as an educator! Your profile is currently being reviewed by our team.
          You will receive an email once your application has been processed.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left space-y-2">
          <p className="text-sm font-medium text-amber-800">What happens next?</p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>Our team reviews your submitted profile</li>
            <li>You receive an approval or feedback email</li>
            <li>Once approved, you get full access to the platform</li>
          </ul>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:support@procreche.ch"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
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

export default EducatorPendingApprovalPage;
