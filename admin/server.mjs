import { createServer } from 'node:http';
import sirv from 'sirv';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

// Serve the Vite build output.
// We implement SPA fallback by internally rewriting non-file routes to
// `/index.html` (no redirects), so deep links like `/login` work reliably.
const serve = sirv('dist', {
  etag: true,
  maxAge: 31536000,
  immutable: true,
});

createServer((req, res) => {
  const rawUrl = req.url ?? '/';
  const pathname = new URL(rawUrl, 'http://localhost').pathname;

  // If there's no file extension in the path, treat it as an SPA route.
  // (This excludes hashed assets like `/assets/app.abc123.js`.)
  const looksLikeFile = pathname.split('/').pop()?.includes('.') ?? false;
  if (!looksLikeFile) {
    req.url = '/index.html';
    res.setHeader('Cache-Control', 'no-cache');
  }

  return serve(req, res);
}).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[admin] serving dist on http://${host}:${port}`);
});

