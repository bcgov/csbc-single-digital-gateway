/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of this app's BFF (citizen-portal-api). Defaults to http://localhost:4000 when unset. */
  readonly VITE_BFF_ORIGIN?: string;
}
