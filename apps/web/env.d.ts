/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URI: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_OIDC_ISSUER: string;
  readonly VITE_OIDC_CLIENT_ID: string;
  readonly VITE_OIDC_REDIRECT_URI: string;
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string;
  readonly VITE_CONSENT_MANAGER_API_URL: string;
  readonly VITE_SERVICE_CATALOGUE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
