/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of this app's BFF (platform-api). Defaults to http://localhost:4001 when unset. */
  readonly VITE_BFF_ORIGIN?: string;
}

interface Window {
  /** Runtime config injected by the container entrypoint (see public/config.js + Dockerfile). */
  __APP_CONFIG__?: { bffOrigin?: string };
}
