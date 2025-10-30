import React, { useState, useEffect, useRef } from 'react';
import { authDebugger } from '../../utils/authDebugger';

const AuthDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true); // Always visible
  const [logs, setLogs] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized by default
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current && !isPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Poll for new logs
  useEffect(() => {
    if (!isVisible) return;

    const refreshLogs = () => {
      const newLogs = authDebugger.getLogLines();
      setLogs(newLogs);
    };

    // Initial load
    refreshLogs();

    // Refresh every 500ms when not paused
    const interval = setInterval(() => {
      if (!authDebugger.isPaused()) {
        refreshLogs();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Check if enabled on mount and watch for changes
  useEffect(() => {
    const checkEnabled = () => {
      // Always show the debugger
      setIsVisible(true);
      setIsPaused(authDebugger.isPaused());
    };

    checkEnabled();

    // Check every 500ms for changes
    const interval = setInterval(checkEnabled, 500);

    // Hotkey to toggle minimized state (Ctrl+`)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsMinimized(!isMinimized);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMinimized]);

  const handleCopyAll = async () => {
    const success = await authDebugger.copyToClipboard();
    setCopySuccess(success);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Clear all debug logs?')) {
      authDebugger.clearLog();
      setLogs(authDebugger.getLogLines());
    }
  };

  const handleNewFlow = () => {
    if (confirm('Start a new authentication flow? This will add a new flow marker.')) {
      authDebugger.newFlow();
      setLogs(authDebugger.getLogLines());
    }
  };

  const handleTogglePause = () => {
    authDebugger.togglePause();
    setIsPaused(authDebugger.isPaused());
  };

  const handleClose = () => {
    // Just minimize instead of closing completely
    setIsMinimized(true);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed z-[9999] bg-gray-900 text-gray-100 border-2 border-green-500 rounded-lg shadow-2xl ${
        isMinimized ? 'top-4 right-4 w-80' : 'top-4 right-4 w-[700px] h-[600px]'
      }`}
      style={{ 
        fontFamily: 'monospace', 
        fontSize: '11px',
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 border-b border-green-500 cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold text-sm text-green-400">🐛 Frontend Debugger</span>
          <span className="text-xs text-gray-400">
            flow={authDebugger.getFlowId().substring(5, 13)}
          </span>
          {isPaused && (
            <span className="text-xs text-yellow-500 font-bold">⏸ PAUSED</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="px-2 py-1 text-xs hover:bg-gray-700 rounded"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '□' : '_'}
          </button>
          <button
            onClick={handleClose}
            className="px-2 py-1 text-xs hover:bg-gray-700 rounded text-gray-400"
            title="Minimize"
          >
            −
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
          <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700 flex-wrap">
            <div className="text-xs text-green-400 font-bold mr-2 self-center">📊 LOGS</div>
            <button
              onClick={handleCopyAll}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              title="Copy all logs to clipboard"
            >
              {copySuccess ? '✓ Copied!' : 'Copy All'}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
              title="Clear all logs"
            >
              Clear
            </button>
            <button
              onClick={handleNewFlow}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors"
              title="Start a new flow (adds marker)"
            >
              New Flow
            </button>
            <button
              onClick={handleTogglePause}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
              title="Pause/Resume UI updates (logging continues)"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <div className="flex-1"></div>
            <span className="text-xs text-gray-400 self-center">
              {logs.length} lines
            </span>
          </div>

          {/* Log Display */}
          <div
            ref={logContainerRef}
            className="overflow-auto h-[calc(100%-88px)] p-2 bg-black"
            style={{
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: '11px',
              lineHeight: '1.5',
            }}
          >
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🐛</div>
                <div className="text-green-400 text-sm font-bold mb-2">
                  Frontend Debugger Active
                </div>
                <div className="text-gray-500 text-xs mb-4">
                  All frontend events will appear here
                </div>
                <div className="text-gray-600 text-xs space-y-1">
                  <div>• Network requests/responses</div>
                  <div>• Component lifecycle</div>
                  <div>• State changes</div>
                  <div>• User interactions</div>
                  <div>• Errors and warnings</div>
                </div>
                <div className="mt-6 text-gray-500 text-xs">
                  Press <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+`</kbd> to minimize
                </div>
                <div className="mt-2 text-gray-600 text-xs">
                  Debugger is always active in development
                </div>
              </div>
            ) : (
              logs.map((line, idx) => (
                <LogLine key={idx} line={line} />
              ))
            )}
          </div>
        </>
      )}

      {isMinimized && (
        <div 
          className="p-3 text-xs text-gray-400 cursor-pointer hover:bg-gray-800 transition-colors" 
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400 animate-pulse">🐛</span>
            <span className="font-bold text-green-400">Frontend Debugger</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">{logs.length} logs</span>
            <span className="text-gray-600">• Click to expand</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Component to render individual log lines with syntax highlighting
const LogLine: React.FC<{ line: string }> = ({ line }) => {
  // Detect banner lines
  if (line.startsWith('=====')) {
    return (
      <div className="text-yellow-400 font-bold bg-yellow-900 bg-opacity-20 px-1 my-1">
        {line}
      </div>
    );
  }

  // Parse log line
  const parts = line.split(' | ');
  if (parts.length < 4) {
    return <div className="text-gray-400">{line}</div>;
  }

  const [timestamp, flow, page, type, action, result, ...detailsParts] = parts;
  const details = detailsParts.join(' | ');

  // Color coding based on result
  let resultColor = 'text-gray-300';
  if (result?.includes('OK')) resultColor = 'text-green-400';
  else if (result?.includes('ERR')) resultColor = 'text-red-400';
  else if (result?.includes('INFO')) resultColor = 'text-blue-400';

  // Color coding based on category
  let categoryColor = 'text-gray-300';
  if (type?.includes('APP')) categoryColor = 'text-purple-400';
  else if (type?.includes('CLERK')) categoryColor = 'text-cyan-400';
  else if (type?.includes('ROUTER') || type?.includes('GUARD'))
    categoryColor = 'text-yellow-400';
  else if (type?.includes('SIGNUP') || type?.includes('LOGIN'))
    categoryColor = 'text-green-400';
  else if (type?.includes('HTTP')) categoryColor = 'text-blue-400';
  else if (type?.includes('ERROR')) categoryColor = 'text-red-400';
  else if (type?.includes('PERF')) categoryColor = 'text-pink-400';

  return (
    <div className="hover:bg-gray-800 px-1 py-0.5 text-[10px]">
      <span className="text-gray-500">{timestamp?.split('|')[0]}</span>
      {' | '}
      <span className="text-gray-600">{flow?.split('|')[0]}</span>
      {' | '}
      <span className="text-gray-500">{page?.split('|')[0]}</span>
      {' | '}
      <span className={categoryColor}>{type?.split('=')[1]}</span>
      {' | '}
      <span className="text-gray-300">{action?.split('=')[1]}</span>
      {' | '}
      <span className={resultColor}>{result?.split('=')[1]}</span>
      {' | '}
      <span className="text-gray-400">{details?.replace('details=', '')}</span>
    </div>
  );
};

export default AuthDebugPanel;
