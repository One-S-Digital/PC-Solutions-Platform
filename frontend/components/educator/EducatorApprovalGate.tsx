import React from 'react';
import { useLocation } from 'react-router-dom';
import { ClockIcon, XCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useClerk } from '@clerk/clerk-react';
import { useAppContext } from '../../contexts/AppContext';
import { EducatorApprovalStatus } from '../../types';

const ALWAYS_ALLOWED = [
  '/educator/profile',
  '/educator/support',
  '/settings',
  '/profile',
  '/support',
  '/pricing',
];

const EducatorApprovalGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const { signOut } = useClerk();
  const location = useLocation();

  const status = currentUser?.approvalStatus;

  const isAllowed = ALWAYS_ALLOWED.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/'),
  );

  if (!status || status === EducatorApprovalStatus.APPROVED || isAllowed) {
    return <>{children}</>;
  }

  const isPending = status === EducatorApprovalStatus.PENDING_REVIEW;

  return (
    <div className="relative">
      {/* Blurred background — dashboard still renders but is inaccessible */}
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isPending ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isPending
                ? <ClockIcon className="w-10 h-10 text-amber-500" />
                : <XCircleIcon className="w-10 h-10 text-red-500" />}
            </div>
          </div>

          {isPending ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Under Review</h1>
              <p className="text-gray-600 mb-6">
                Your application has been submitted and is currently being reviewed by our team.
                You will be notified by email once your application has been approved.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left space-y-2">
                <p className="text-sm font-medium text-amber-800">What happens next?</p>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>Our team reviews your submitted profile</li>
                  <li>You receive an approval or feedback email</li>
                  <li>Once approved, you get full access to the platform</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Not Approved</h1>
              <p className="text-gray-600 mb-6">
                Unfortunately, your educator application was not approved at this time.
                Please review the reason below and contact our support team if you have questions.
              </p>
              {currentUser?.approvalNotes && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-red-800 mb-1">Reason provided by our team:</p>
                  <p className="text-sm text-red-700">{currentUser.approvalNotes}</p>
                </div>
              )}
            </>
          )}

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
    </div>
  );
};

export default EducatorApprovalGate;
