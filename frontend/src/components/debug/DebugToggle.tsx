import React, { useState } from 'react';
import { BugAntIcon } from '@heroicons/react/24/outline';
import DebugPanel from './DebugPanel';

const DebugToggle: React.FC = () => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Only show in development or when debug is enabled
  const showDebug = process.env.NODE_ENV === 'development' || 
                   localStorage.getItem('debug-enabled') === 'true';

  if (!showDebug) return null;

  return (
    <>
      <button
        onClick={() => setIsDebugOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
        title="Open Debug Panel"
      >
        <BugAntIcon className="w-5 h-5" />
      </button>
      
      <DebugPanel 
        isOpen={isDebugOpen} 
        onClose={() => setIsDebugOpen(false)} 
      />
    </>
  );
};

export default DebugToggle;