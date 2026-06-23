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
  /** Pre-built OIDC `Configuration`; when set, discovery is skipped (tests / advanced wiring). */
  config?: Configuration;
}
