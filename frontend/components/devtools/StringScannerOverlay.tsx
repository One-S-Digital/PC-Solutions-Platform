import React, { useCallback, useMemo, useState } from 'react';

type ScanResult = {
  text: string;
  count: number;
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function collectVisibleStrings(): ScanResult[] {
  if (!isBrowser) {
    return [];
  }

  const results = new Map<string, number>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    const textContent = node.textContent?.replace(/\s+/g, ' ').trim();
    const parentElement = (node as Text).parentElement;

    if (
      textContent &&
      parentElement &&
      !parentElement.closest('[data-string-scanner-ignore="true"]')
    ) {
      const style = window.getComputedStyle(parentElement);
      const rect = parentElement.getBoundingClientRect();
      const isHidden =
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        parseFloat(style.opacity || '1') === 0 ||
        rect.width === 0 ||
        rect.height === 0;

      const isOffscreen =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;

      if (!isHidden && !isOffscreen) {
        results.set(textContent, (results.get(textContent) ?? 0) + 1);
      }
    }

    node = walker.nextNode();
  }

  return Array.from(results.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

const copyToClipboard = async (payload: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
    } else {
      const tempInput = document.createElement('textarea');
      tempInput.value = payload;
      tempInput.setAttribute('readonly', '');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    return true;
  } catch (error) {
    console.error('[string-scanner] Failed to copy results', error);
    return false;
  }
};

const StringScannerOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleScan = useCallback(() => {
    if (!isBrowser || isScanning) {
      return;
    }

    setIsScanning(true);
    requestAnimationFrame(() => {
      const scanResults = collectVisibleStrings();
      setResults(scanResults);
      setLastRun(new Date());

      console.groupCollapsed(
        `%c[String Scanner] ${scanResults.length} unique strings found`,
        'color:#10b981;font-weight:600;',
      );
      scanResults.forEach((item, index) => {
        console.log(`${index + 1}. (${item.count}×) ${item.text}`);
      });
      console.groupEnd();

      setIsScanning(false);
      setCopyState('idle');
    });
  }, [isScanning]);

  const handleCopy = useCallback(async () => {
    if (results.length === 0) {
      return;
    }

    const payload = results.map(item => `${item.count}× ${item.text}`).join('\n');
    const success = await copyToClipboard(payload);
    setCopyState(success ? 'copied' : 'error');

    if (success) {
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [results]);

  const summary = useMemo(() => {
    const total = results.reduce((sum, item) => sum + item.count, 0);
    return { total, unique: results.length };
  }, [results]);

  if (!isBrowser) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 text-sm"
      data-string-scanner-ignore="true"
    >
      {isOpen ? (
        <div className="w-80 max-w-[90vw] rounded-lg bg-white shadow-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Dev Utility</p>
              <h2 className="text-sm font-semibold text-gray-800">Visible String Scanner</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2"
              aria-label="Close string scanner"
            >
              <span className="block h-4 w-4 text-center leading-4">×</span>
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="flex-1 rounded-md bg-swiss-mint px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-swiss-mint/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isScanning ? 'Scanning…' : 'Scan Visible Strings'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={results.length === 0 || copyState === 'copied'}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {copyState === 'copied'
                  ? 'Copied!'
                  : copyState === 'error'
                    ? 'Copy failed'
                    : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {summary.unique === 0
                  ? 'No scan results yet'
                  : `${summary.unique} unique strings / ${summary.total} occurrences`}
              </span>
              {lastRun && (
                <span>
                  Ran {lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded border border-gray-100 bg-gray-50">
              {results.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-500">
                  Press <strong>Scan Visible Strings</strong> to list on-screen text nodes.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 text-xs leading-relaxed text-gray-700">
                  {results.slice(0, 200).map(item => (
                    <li key={`${item.text}-${item.count}`} className="px-3 py-2">
                      <span className="mr-1 inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded bg-white px-1 text-[0.65rem] font-semibold text-gray-500 shadow-sm">
                        {item.count}×
                      </span>
                      <span className="break-words">{item.text}</span>
                    </li>
                  ))}
                  {results.length > 200 && (
                    <li className="px-3 py-2 text-gray-400">
                      …and {results.length - 200} more strings
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2"
          aria-label="Open string scanner"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-swiss-mint" />
          Visible Strings
        </button>
      )}
    </div>
  );
};

export default StringScannerOverlay;
