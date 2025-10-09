import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationEntry {
  key: string;
  namespace: string;
  value: string;
  timestamp: number;
  page: string;
}

export const TranslationDebugger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [filter, setFilter] = useState('');
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!i18n) {
      console.error('[TranslationDebugger] i18n is not available in useEffect');
      return;
    }
    
    // Intercept i18n.t calls
    const originalT = i18n.t.bind(i18n);
    
    i18n.t = function(...args: any[]) {
      const result = originalT(...args);
      const key = typeof args[0] === 'string' ? args[0] : String(args[0]);
      
      // Parse namespace and key
      const parts = key.includes(':') ? key.split(':') : ['common', key];
      const namespace = parts.length > 1 ? parts[0] : 'common';
      const actualKey = parts.length > 1 ? parts[1] : parts[0];
      
      // Record the translation
      setTranslations(prev => {
        const exists = prev.some(t => t.key === actualKey && t.namespace === namespace);
        if (!exists) {
          return [...prev, {
            key: actualKey,
            namespace,
            value: String(result),
            timestamp: Date.now(),
            page: window.location.pathname,
          }];
        }
        return prev;
      });
      
      return result;
    };

    // Listen for keyboard shortcut (Ctrl+Shift+T)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      i18n.t = originalT;
    };
  }, [i18n]);

  const copyToClipboard = useCallback(() => {
    const data = {
      totalTranslations: translations.length,
      languages: [i18n.language],
      capturedAt: new Date().toISOString(),
      translations: translations.map(t => ({
        namespace: t.namespace,
        key: t.key,
        value: t.value,
        page: t.page,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('Translation data copied to clipboard!');
  }, [translations, i18n.language]);

  const exportAsJSON = useCallback(() => {
    const data = {
      totalTranslations: translations.length,
      languages: [i18n.language],
      capturedAt: new Date().toISOString(),
      translations: translations.map(t => ({
        namespace: t.namespace,
        key: t.key,
        value: t.value,
        page: t.page,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-debug-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [translations, i18n.language]);

  const clearTranslations = useCallback(() => {
    setTranslations([]);
  }, []);

  const filteredTranslations = translations.filter(t => 
    t.key.toLowerCase().includes(filter.toLowerCase()) ||
    t.namespace.toLowerCase().includes(filter.toLowerCase()) ||
    t.value.toLowerCase().includes(filter.toLowerCase())
  );

  const groupedByNamespace = filteredTranslations.reduce((acc, t) => {
    if (!acc[t.namespace]) {
      acc[t.namespace] = [];
    }
    acc[t.namespace].push(t);
    return acc;
  }, {} as Record<string, TranslationEntry[]>);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-[9999] flex items-center gap-2"
        title="Press Ctrl+Shift+T to toggle"
        style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 9999 }}
      >
        🌐 Translation Debug ({translations.length})
      </button>
    );
  }

  return (
    <div className="fixed inset-y-4 right-4 w-96 bg-white shadow-2xl rounded-lg flex flex-col z-[9999] border border-gray-200" style={{ zIndex: 9999 }}>
      {/* Header */}
      <div className="bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Translation Debugger</h3>
          <p className="text-xs text-purple-200">Press Ctrl+Shift+T to toggle</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-purple-200 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div className="p-3 bg-purple-50 border-b border-purple-200 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold">Total Captured:</span>
          <span className="text-purple-700">{translations.length}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-semibold">Language:</span>
          <span className="text-purple-700">{i18n.language}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-gray-200 flex gap-2 flex-wrap">
        <button
          onClick={copyToClipboard}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
        >
          📋 Copy JSON
        </button>
        <button
          onClick={exportAsJSON}
          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
        >
          💾 Download
        </button>
        <button
          onClick={clearTranslations}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Filter translations..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      {/* Translation List */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.keys(groupedByNamespace).length === 0 ? (
          <p className="text-gray-500 text-center text-sm mt-8">
            No translations captured yet. Navigate through the app to capture translations.
          </p>
        ) : (
          Object.entries(groupedByNamespace).map(([namespace, entries]) => (
            <div key={namespace} className="mb-4">
              <h4 className="font-semibold text-purple-700 mb-2 sticky top-0 bg-white py-1">
                {namespace} ({entries.length})
              </h4>
              {entries.map((t, idx) => (
                <div
                  key={`${t.namespace}-${t.key}-${idx}`}
                  className="mb-2 p-2 bg-gray-50 rounded text-xs border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="font-mono text-blue-600 mb-1">
                    {t.key}
                  </div>
                  <div className="text-gray-700 mb-1">
                    {t.value}
                  </div>
                  <div className="text-gray-400 text-xs">
                    📄 {t.page}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 text-center rounded-b-lg">
        Capturing all i18n.t() calls in real-time
      </div>
    </div>
  );
};
