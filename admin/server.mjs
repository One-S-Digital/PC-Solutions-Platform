import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

let indexHtml;
try {
  indexHtml = readFileSync(path.join(process.cwd(), 'dist', 'index.html'));
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[admin] Failed to read dist/index.html. Did you run the build?', err);
  indexHtml = null;
}

// Serve the Vite build output.
// We implement SPA fallback by internally rewriting non-file routes to
// `/index.html` (no redirects), so deep links like `/login` work reliably.
const serve = sirv('dist', {
  etag: true,
  dev: false,
  maxAge: 0,
  immutable: false,
  setHeaders(res, pathname) {
    const p = pathname.startsWith('/') ? pathname : `/${pathname}`;

    // Cache-busting is handled by hashed filenames, so cache built assets
    // aggressively. The SPA entrypoint is served outside of sirv.
    const isAsset =
      p.startsWith('/assets/') ||
      /\.(?:js|mjs|css|map|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/.test(p);

    if (isAsset) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
});

createServer((req, res) => {
  const rawUrl = req.url ?? '/';
  const pathname = new URL(rawUrl, 'http://localhost').pathname;

  // If there's no file extension in the path, treat it as an SPA route.
  // (This excludes hashed assets like `/assets/app.abc123.js`.)
  const looksLikeFile = pathname.split('/').pop()?.includes('.') ?? false;
  const isSpaRoute = pathname === '/' || pathname === '/index.html' || !looksLikeFile;
  if (isSpaRoute) {
    if (!indexHtml) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Admin not built (missing dist/index.html).');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    if (req.method === 'HEAD') return res.end();
    return res.end(indexHtml);
  }

  return serve(req, res);
}).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[admin] serving dist on http://${host}:${port}`);
});

