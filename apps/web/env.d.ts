/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URI: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_CONSENT_MANAGER_API_URL: string;
  readonly VITE_SERVICE_CATALOGUE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
