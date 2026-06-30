import type { Store } from 'express-session';
// Type-only import: erased at compile, so importing the ESM-only openid-client for a TYPE
// is fine from this CommonJS package (no require/import emitted).
import type { Configuration } from 'openid-client';

/** Standard OIDC claims plus any provider-specific extras. */
export interface OidcClaims {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [claim: string]: unknown;
}

/** The authenticated principal stored in the session. */
export interface AuthUser {
  id: string;
  roles: string[];
  claims: OidcClaims;
}

/** The OIDC token set kept server-side in the session (never sent to the browser). */
export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  /** Access-token expiry as epoch ms (= now + `expires_in`); undefined if the IdP omitted it. */
  expiresAt?: number;
}

/**
 * The sync port the module calls after a successful token exchange, before establishing the
 * session. Consumers implement it to persist/resolve the user and assign roles; the package
 * ships a passthrough default.
 */
export interface AuthUserSync {
  onSignIn(claims: OidcClaims): Promise<AuthUser>;
}

export interface AuthSessionOptions {
  secret: string;
  /** Mark the cookie `secure` (HTTPS-only) — true outside development. */
  secure?: boolean;
  /** Session store; omit for express-session's default `MemoryStore` (dev/test). */
  store?: Store;
  cookieMaxAge?: number;
  /**
   * The session cookie name. MUST be unique per app when multiple BFFs share a host (cookies are
   * scoped by host+path, NOT port) — otherwise `localhost:4000` and `localhost:4001` clobber each
   * other's `connect.sid`, sending the wrong session id and 401-ing. Defaults to `connect.sid`.
   */
  cookieName?: string;
}

export interface AuthModuleOptions {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  postLoginRedirect: string;
  session: AuthSessionOptions;
  /**
   * Extra public path prefixes the global guard allows without auth, beyond the package's own
   * intrinsically-public `/auth` routes (e.g. `['/health']`). Boundary-matched.
   */
  publicPaths?: string[];
  /** Enable RP-initiated logout (redirect to the IdP `end_session_endpoint`). Default false. */
  rpLogout?: boolean;
  /** Where the IdP returns the browser after RP-initiated logout (pre-registered at the IdP). */
  postLogoutRedirect?: string;
  /**
   * Allowed `Origin`s for state-changing (mutating) requests — the CSRF Origin guard's allowlist
   * (e.g. `['https://app.sdg.gov']`). When omitted/empty the CSRF guard is inert (opt-in).
   */
  allowedOrigins?: string[];
  /**
   * Refresh the access token this many seconds before it expires (the lazy-refresh skew window).
   * Default 30.
   */
  tokenRefreshSkewSeconds?: number;
  /** Pre-built OIDC `Configuration`; when set, discovery is skipped (tests / advanced wiring). */
  config?: Configuration;
}
