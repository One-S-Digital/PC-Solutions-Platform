import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Legacy plugin transpiles ES2020+ features (optional chaining, nullish coalescing, etc.)
    // for older browsers (Safari 12-13.0, Edge 79, iOS 12-13.3) while keeping modern code
    // for browsers that support it natively (Safari 13.1+, Edge 80+, iOS 13.4+)
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    })
  ],
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
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
  },
})
