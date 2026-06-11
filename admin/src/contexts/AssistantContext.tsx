import React, { createContext, useContext, useState } from 'react';

interface AssistantContextValue {
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AssistantContext.Provider
      value={{ isOpen, openAssistant: () => setIsOpen(true), closeAssistant: () => setIsOpen(false) }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = (): AssistantContextValue => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider');
  return ctx;
};
