import React, { useState, useEffect } from 'react';
import { authDebugger } from '../../utils/authDebugger';

/**
 * Floating toggle button to enable/disable the frontend debugger
 * Always visible in bottom-right corner
 */
const FrontendDebugToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if already enabled
    setIsEnabled(authDebugger.isEnabled());

    // Check every 500ms for changes
    const interval = setInterval(() => {
      setIsEnabled(authDebugger.isEnabled());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    if (isEnabled) {
      authDebugger.disable();
      setIsEnabled(false);
    } else {
      authDebugger.enable();
      setIsEnabled(true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`fixed bottom-4 right-4 z-[9998] px-4 py-2 rounded-full shadow-lg font-mono text-xs font-bold transition-all hover:scale-110 ${
        isEnabled
          ? 'bg-green-500 text-white hover:bg-green-600'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
      title={isEnabled ? 'Debug: ON (Click to disable)' : 'Debug: OFF (Click to enable)'}
      style={{ fontFamily: 'monospace' }}
    >
      {isEnabled ? '🐛 DEBUG ON' : '🐛 DEBUG'}
    </button>
  );
};

export default FrontendDebugToggle;
