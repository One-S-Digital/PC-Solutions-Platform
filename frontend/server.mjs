import { createServer } from 'node:http';
import sirv from 'sirv';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

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
    // aggressively. Never cache the SPA entrypoint.
    if (p === '/index.html') {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }

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
  if (!looksLikeFile) {
    req.url = '/index.html';
    // Ensure SPA routes (e.g. /login) aren't cached.
    res.setHeader('Cache-Control', 'no-cache');
  }

  return serve(req, res);
}).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] serving dist on http://${host}:${port}`);
});

