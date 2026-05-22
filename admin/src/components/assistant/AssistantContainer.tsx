import React, { useState } from 'react';
import { AssistantButton } from './AssistantButton';
import { AssistantPanel } from './AssistantPanel';

export const AssistantContainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && <AssistantButton onOpen={() => setIsOpen(true)} />}
      <AssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
