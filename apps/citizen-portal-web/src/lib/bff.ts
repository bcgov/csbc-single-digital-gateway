/**
 * Browser-side client for the BFF OIDC endpoints (feature 27). Tokens never reach the browser —
 * only the httpOnly session cookie, which every call carries via `credentials: 'include'`. The two
 * data calls (`/auth/me`, `/auth/logout`) are cross-origin to the BFF, so the API must allow this
 * origin with credentialed CORS.
 */

/** OIDC claims surfaced by the BFF — mirrors `@repo/nestjs/auth` `OidcClaims`. */
export interface OidcClaims {
  sub: string;
  email?: string;
  /** Citizen realm's preferred display label (see `keycloak/citizens-realm.json` mapper). */
  display_name?: string;
  name?: string;
  preferred_username?: string;
  [claim: string]: unknown;
}

/** The current user returned by `GET /auth/me` — mirrors `@repo/nestjs/auth` `AuthUser`. */
export interface AuthUser {
  id: string;
  roles: string[];
  claims: OidcClaims;
}

/**
 * Origin of this app's BFF (citizen-portal-api); overridable per environment. Resolution order:
 *   1. runtime window config injected by the container entrypoint (see public/config.js),
 *   2. build-time `VITE_BFF_ORIGIN` (dev / baked builds),
 *   3. localhost dev default.
 * `||` (not `??`) so an empty string from any source falls through.
 */
export const BFF_ORIGIN =
  window.__APP_CONFIG__?.bffOrigin || import.meta.env.VITE_BFF_ORIGIN || 'http://localhost:4000';

/** Top-level navigation target that starts the OIDC login flow. */
export const loginUrl = `${BFF_ORIGIN}/auth/login`;

/**
 * Login URL that returns the browser to `path` (a site-relative path, e.g. `/services/42?tab=x`)
 * after the OIDC round-trip. The BFF validates and pins it to this app's origin (feature 67).
 */
export function loginUrlFor(path: string): string {
  return `${loginUrl}?returnTo=${encodeURIComponent(path)}`;
}

/** The signed-in user, or `null` when there is no session (401). Throws on any other failure. */
export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`GET /auth/me failed: ${res.status}`);
  }
  return (await res.json()) as AuthUser;
}

/** Destroy the BFF session. The browser sends `Origin` automatically (CSRF-allowlisted). */
export async function logout(): Promise<void> {
  await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
}

/**
 * Best-effort greeting label: display name → email → opaque id. Mirrors the citizen-portal-api
 * `mapClaims` order (`display_name ?? email ?? sub`); `user.id` is the always-present final
 * fallback here (the browser never sees a bare `sub`).
 */
export function displayName(user: AuthUser): string {
  return user.claims.display_name ?? user.claims.email ?? user.id;
}
