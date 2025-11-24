import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
          '@workspace/translations': path.resolve(__dirname, '../packages/translations'),
        }
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
