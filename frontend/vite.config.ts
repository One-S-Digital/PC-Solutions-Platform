import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@workspace/translations': path.resolve(__dirname, '../packages/translations/src/index.ts'),
          '@repo/ui': path.resolve(__dirname, '../packages/ui/src/index.ts'),
        },
        // Dedupe ensures we only load a single copy of these dependencies even
        // though the shared translation package has its own node_modules
        // folder. Without this Vite would bundle separate instances of React
        // and react-i18next which causes hooks such as useTranslation to throw
        // and the app to render a blank screen.
        dedupe: ['react', 'react-dom', 'react-i18next', 'i18next'],
      },
      // Ensure static assets are properly copied
      publicDir: 'public',
      build: {
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
