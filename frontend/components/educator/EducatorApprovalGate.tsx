import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { EducatorApprovalStatus } from '../../types';

// Routes the educator can always access regardless of approval status
const ALWAYS_ALLOWED = [
  '/educator/profile',
  '/educator/support',
  '/educator/pending-approval',
  '/educator/rejected',
  '/settings',
  '/profile',
  '/support',
  '/pricing',
];

const EducatorApprovalGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const location = useLocation();

  const status = (currentUser as any)?.approvalStatus as EducatorApprovalStatus | null | undefined;

  const isAllowed = ALWAYS_ALLOWED.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/'),
  );

  if (isAllowed) {
    return <>{children}</>;
  }

  if (status === EducatorApprovalStatus.REJECTED) {
    return <Navigate to="/educator/rejected" replace />;
  }

  if (status !== EducatorApprovalStatus.APPROVED) {
    return <Navigate to="/educator/pending-approval" replace />;
  }

  return <>{children}</>;
};

export default EducatorApprovalGate;
