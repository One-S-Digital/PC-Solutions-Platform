import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  const sentryEnabled = isProd && env.VITE_SENTRY_DSN && env.SENTRY_AUTH_TOKEN;
  
  return {
    plugins: [
      react(),
      // Legacy plugin transpiles ES2020+ features (optional chaining, nullish coalescing, etc.)
      // for older browsers (Safari 12-13.0, Edge 79, iOS 12-13.3) while keeping modern code
      // for browsers that support it natively (Safari 13.1+, Edge 80+, iOS 13.4+)
      legacy({
        targets: ['defaults', 'not IE 11'],
        modernPolyfills: true,
        renderLegacyChunks: true,
      }),
      // Sentry plugin for source maps upload (only in production builds)
      sentryEnabled ? sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT || 'admin',
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: './dist/**',
        },
        release: {
          name: env.VITE_SENTRY_RELEASE || `admin@${Date.now()}`,
        },
        // Upload source maps but delete them after upload for security
        telemetry: false,
      }) : undefined,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@repo/ui': path.resolve(__dirname, '../packages/ui/src'),
        '@workspace/translations': path.resolve(__dirname, '../packages/translations'),
      },
    },
    build: {
      // Target ES2020 for modern browsers (Safari 13.1+, Edge 80+, iOS 13.4+)
      // Legacy plugin will transpile to ES5 for older browsers automatically
      target: 'es2020',
      // Generate source maps for Sentry
      sourcemap: isProd,
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      allowedHosts: true,
    },
  };
})
