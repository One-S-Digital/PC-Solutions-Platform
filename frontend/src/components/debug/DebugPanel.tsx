import React, { useState, useEffect } from 'react';
import { debugLogger, DebugLogEntry } from '../../utils/debugLogger';
import { XMarkIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      
      if (autoRefresh) {
        const interval = setInterval(loadLogs, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [isOpen, autoRefresh]);

  const loadLogs = () => {
    const allLogs = debugLogger.getLogs();
    setLogs(allLogs);
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.category === filter);

  const categories = Array.from(new Set(logs.map(log => log.category)));

  const clearLogs = () => {
    debugLogger.clearLogs();
    setLogs([]);
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative flex h-full flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Debug Logs</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-sm rounded ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              Auto: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={loadLogs}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {filteredLogs.length} logs
            </span>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found</p>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900">{log.category}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-gray-800 mb-2">{log.message}</div>
                  
                  {log.data && (
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total logs: {logs.length}</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;