import { createServer } from 'node:http';
import sirv from 'sirv';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

// Serve the Vite build output. `single: true` returns `index.html` for
// any non-file route (e.g. `/login`) without redirecting to `/index.html`.
const serve = sirv('dist', {
  etag: true,
  single: true,
  maxAge: 31536000,
  immutable: true,
  setHeaders(res, pathname) {
    // Don't cache the SPA entrypoint; cache-busting is handled by hashed assets.
    if (pathname === '/index.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
});

createServer((req, res) => serve(req, res)).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[admin] serving dist on http://${host}:${port}`);
});

