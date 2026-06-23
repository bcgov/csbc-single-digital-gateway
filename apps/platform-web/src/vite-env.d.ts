/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of this app's BFF (platform-api). Defaults to http://localhost:4001 when unset. */
  readonly VITE_BFF_ORIGIN?: string;
}
