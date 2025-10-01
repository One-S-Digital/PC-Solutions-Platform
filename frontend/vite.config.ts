import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    const isStaging = mode === 'staging';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2015',
        minify: isProduction ? 'terser' : 'esbuild',
        sourcemap: !isProduction,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['react-router-dom'],
              ui: ['@heroicons/react'],
              i18n: ['react-i18next', 'i18next'],
              auth: ['@clerk/clerk-react'],
              utils: ['axios', 'react-hot-toast'],
            },
            chunkFileNames: isProduction 
              ? 'assets/[name]-[hash].js' 
              : 'assets/[name].js',
            entryFileNames: isProduction 
              ? 'assets/[name]-[hash].js' 
              : 'assets/[name].js',
            assetFileNames: isProduction 
              ? 'assets/[name]-[hash].[ext]' 
              : 'assets/[name].[ext]',
          },
        },
        terserOptions: isProduction ? {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        } : undefined,
        chunkSizeWarningLimit: 1000,
      },
      preview: {
        port: 4173,
        host: '0.0.0.0',
      },
    };
});
