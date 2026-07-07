/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of this app's BFF (citizen-portal-api). Defaults to http://localhost:4000 when unset. */
  readonly VITE_BFF_ORIGIN?: string;
}

interface Window {
  /** Runtime config injected by the container entrypoint (see public/config.js + Dockerfile). */
  __APP_CONFIG__?: { bffOrigin?: string };
}
