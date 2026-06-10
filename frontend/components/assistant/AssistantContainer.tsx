import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { UserRole } from '../../types';
import { AssistantButton } from './AssistantButton';
import { AssistantPanel } from './AssistantPanel';

const ALLOWED_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.EDUCATOR,
  UserRole.PARENT,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

export const AssistantContainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAppContext();
  const location = useLocation();

  // Only render for allowed roles
  if (!currentUser || !ALLOWED_ROLES.includes(currentUser.role)) {
    return null;
  }

  // The full-page assistant workspace already hosts the chat — the floating
  // widget would duplicate it there.
  if (location.pathname.startsWith('/foundation/assistant')) {
    return null;
  }

  // Feature-flag gate: VITE_AI_ASSISTANT_ENABLED must be "true" if set
  // If the env var is absent we still show the assistant for allowed roles
  const featureEnabled = import.meta.env.VITE_AI_ASSISTANT_ENABLED !== 'false';
  if (!featureEnabled) return null;

  return (
    <>
      {!isOpen && <AssistantButton onOpen={() => setIsOpen(true)} />}
      <AssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
