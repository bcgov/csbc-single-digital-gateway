/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URI: string;
  readonly VITE_APP_NAME: string;
  readonly ITE_OIDC_ISSUER: string;
  readonly ITE_OIDC_CLIENT_ID: string;
  readonly ITE_OIDC_REDIRECT_URI: string;
  readonly ITE_OIDC_POST_LOGOUT_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
