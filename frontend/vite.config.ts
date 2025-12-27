import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const e2eMockApiPlugin = () => {
  return {
    name: 'e2e-mock-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url: string = req.url || '';

        if (!url.startsWith('/api/')) {
          return next();
        }

        // Basic JSON helper
        const sendJson = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };

        // Public frontend settings (used on login/signup)
        if (url.startsWith('/api/settings/frontend/public')) {
          return sendJson(200, {
            success: true,
            data: {
              siteName: 'Pro Crèche Solutions',
              logoAsset: null,
              faviconAsset: null,
            },
          });
        }

        // Parent lead form submission
        if (url.startsWith('/api/parent-leads') && req.method === 'POST') {
          let raw = '';
          req.on('data', (chunk: Buffer) => (raw += chunk.toString('utf8')));
          req.on('end', () => {
            let parsed: unknown = raw;
            try {
              parsed = raw ? JSON.parse(raw) : {};
            } catch {
              // ignore
            }
            sendJson(200, { success: true, data: parsed });
          });
          return;
        }

        // Generic OK for any other API calls in E2E
        return sendJson(200, { success: true, data: {} });
      });
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isE2E = process.env.VITE_E2E_TEST === 'true' || env.VITE_E2E_TEST === 'true';
    if (mode === 'e2e') {
      // Helpful diagnostics for Playwright runs
      console.log('[vite] e2e mode diagnostics:', {
        mode,
        isE2E,
        envE2E: env.VITE_E2E_TEST,
        procE2E: process.env.VITE_E2E_TEST,
      });
    }
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      plugins: [react(), isE2E ? e2eMockApiPlugin() : undefined].filter(Boolean),
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __E2E__: JSON.stringify(isE2E),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@workspace/translations': path.resolve(__dirname, '../packages/translations'),
        }
      },
      // Ensure static assets are properly copied
      publicDir: 'public',
      build: {
        // Target ES2020 for better browser compatibility (supports Safari 13.1+, Edge 80+)
        target: 'es2020',
        // Ensure locales are included in build
        assetsDir: 'assets',
        rollupOptions: {
          // Make sure locales are accessible
          external: [],
        },
      },
      // Allow importing JSON files
      json: {
        namedExports: true,
        stringify: false
      }
    };
});
