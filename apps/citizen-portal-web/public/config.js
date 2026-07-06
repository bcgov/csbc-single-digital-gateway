// Runtime SPA config, consumed by src/lib/bff.ts via window.__APP_CONFIG__.
// This committed placeholder is served in dev and copied verbatim into dist by Vite (public
// assets are not hashed/processed). In the container it is OVERWRITTEN at start by
// docker/40-render-runtime-config.sh from $BFF_ORIGIN. Empty here → the app falls back to
// import.meta.env.VITE_BFF_ORIGIN (build-time / dev).
window.__APP_CONFIG__ = {};
