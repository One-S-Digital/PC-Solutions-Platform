import React from 'react';
import { AssistantButton } from './AssistantButton';
import { AssistantPanel } from './AssistantPanel';
import { useAssistant } from '../../contexts/AssistantContext';

export const AssistantContainer: React.FC = () => {
  const { isOpen, openAssistant, closeAssistant } = useAssistant();

  return (
    <>
      {!isOpen && <AssistantButton onOpen={openAssistant} />}
      <AssistantPanel isOpen={isOpen} onClose={closeAssistant} />
    </>
  );
};
