/**
 * Temporary diagnostic for the Safari signup-password freeze.
 *
 * Enable by appending `?debug=1` to the signup URL.
 *
 * Once active it captures:
 *  - Every focus/blur event on inputs (with timing and target identity)
 *  - Every main-thread long task (>50ms) reported by PerformanceObserver
 *  - Every iframe and <script> insertion (so we can see who is mounting bot
 *    detection / 3rd-party widgets and when)
 *  - All cross-frame postMessage traffic in both directions
 *  - An initial inventory of iframes already on the page
 *
 * All entries are pushed onto `window.__safariDebug` and also printed to the
 * console. The user can run `dumpSafariDebug()` from the console to get a
 * compact JSON dump to copy/paste.
 */

declare global {
  interface Window {
    __safariDebug?: Array<Record<string, unknown>>;
    __safariDebugInstalled?: boolean;
    dumpSafariDebug?: () => string;
  }
}

const MAX_ENTRIES = 1000;

function record(kind: string, data: Record<string, unknown>) {
  const entry = {
    t: Math.round(performance.now()),
    kind,
    ...data,
  };
  const buf = window.__safariDebug!;
  buf.push(entry);
  if (buf.length > MAX_ENTRIES) buf.shift();
  // eslint-disable-next-line no-console
  console.log('[safari-debug]', entry);
}

function describeTarget(target: EventTarget | null): Record<string, unknown> {
  if (!(target instanceof Element)) return { tag: null };
  const el = target as HTMLInputElement;
  return {
    tag: el.tagName,
    id: el.id || undefined,
    name: el.name || undefined,
    type: el.type || undefined,
    autocomplete: el.autocomplete || undefined,
  };
}

export function installSafariDebug() {
  if (typeof window === 'undefined') return;
  if (window.__safariDebugInstalled) return;
  window.__safariDebugInstalled = true;
  window.__safariDebug = [];

  // Inventory of iframes already in the document.
  const initialIframes = Array.from(document.querySelectorAll('iframe')).map((f) => ({
    src: f.src,
    id: f.id || undefined,
    title: f.title || undefined,
    hidden: getComputedStyle(f).display === 'none',
  }));
  record('init', {
    ua: navigator.userAgent,
    url: location.href,
    iframeCount: initialIframes.length,
    iframes: initialIframes,
  });

  // Focus / blur tracking on every input on the page.
  ['focusin', 'focusout', 'click'].forEach((evt) => {
    document.addEventListener(
      evt,
      (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.tagName !== 'INPUT' && t.tagName !== 'BUTTON' && t.tagName !== 'TEXTAREA') return;
        record(`event:${evt}`, describeTarget(t));
      },
      true,
    );
  });

  // Main-thread long tasks. Safari supports PerformanceObserver but historically
  // not the 'longtask' entry type, so we try the modern entry first and fall
  // back to 'measure' / 'event' which is supported on recent WebKit.
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        record('longtask', {
          name: entry.name,
          dur: Math.round(entry.duration),
          startT: Math.round(entry.startTime),
        });
      }
    });
    try {
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Safari fallback: 'event' timing surfaces handlers >= 104ms by default.
      observer.observe({ type: 'event', buffered: true, durationThreshold: 50 } as PerformanceObserverInit);
    }
  } catch (err) {
    record('observer-error', { message: String(err) });
  }

  // Track iframe / script insertions anywhere in the document.
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.tagName === 'IFRAME') {
          const f = n as HTMLIFrameElement;
          record('iframe-added', {
            src: f.src || undefined,
            id: f.id || undefined,
            title: f.title || undefined,
            parent: f.parentElement?.id || f.parentElement?.tagName,
          });
        } else if (n.tagName === 'SCRIPT') {
          const s = n as HTMLScriptElement;
          record('script-added', {
            src: s.src || undefined,
            async: s.async,
            defer: s.defer,
          });
        } else {
          // Recurse into added subtrees to catch iframes mounted inside wrappers.
          n.querySelectorAll?.('iframe').forEach((f) => {
            record('iframe-added-nested', {
              src: f.src || undefined,
              id: f.id || undefined,
              title: f.title || undefined,
            });
          });
        }
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // postMessage traffic both directions.
  const origPost = window.postMessage.bind(window);
  window.postMessage = ((...args: Parameters<typeof window.postMessage>) => {
    record('postMessage-out', { argCount: args.length, target: String(args[1] ?? '') });
    return origPost(...args);
  }) as typeof window.postMessage;

  window.addEventListener(
    'message',
    (e) => {
      record('postMessage-in', {
        origin: e.origin,
        sourceIsIframe: e.source !== window,
        dataKind: typeof e.data,
        dataPreview: typeof e.data === 'string' ? e.data.slice(0, 80) : undefined,
      });
    },
    true,
  );

  window.dumpSafariDebug = () => {
    const json = JSON.stringify(window.__safariDebug, null, 2);
    // eslint-disable-next-line no-console
    console.log(json);
    return json;
  };

  // eslint-disable-next-line no-console
  console.log(
    '[safari-debug] installed. Reproduce the freeze, then run dumpSafariDebug() in the console to copy the log.',
  );
}
