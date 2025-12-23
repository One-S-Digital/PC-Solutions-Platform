/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_NODE_ENV: string;
  readonly VITE_E2E_TEST?: string;
  readonly VITE_USE_BUNDLED_TRANSLATIONS?: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by Vite `define` in E2E mode
declare const __E2E__: boolean;
