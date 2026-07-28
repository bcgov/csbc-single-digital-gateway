import type { Configuration } from 'openid-client';

import type { OidcClaims, SessionTokens } from './auth.types';

/** The subset of an OIDC token-endpoint response the session needs. */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

/** Map a token-endpoint response to the server-side session token set (computes `expiresAt`). */
export function toSessionTokens(response: TokenResponse): SessionTokens {
  const tokens: SessionTokens = { accessToken: response.access_token };
  if (response.refresh_token !== undefined) {
    tokens.refreshToken = response.refresh_token;
  }
  if (response.expires_in !== undefined) {
    tokens.expiresAt = Date.now() + response.expires_in * 1000;
  }
  return tokens;
}

/** OIDC transaction state carried across the login -> callback hop (in the session). */
export interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface OidcLoginOptions {
  redirectUri: string;
  scopes?: string[];
}

/** The session shape the flow helpers read/write (a subset of express-session's SessionData). */
interface FlowSession {
  oidcTx?: OidcTransaction;
}

/** Result of a successful callback: the id-token claims, the raw id_token, and the token set. */
export interface CompletedLogin {
  claims: OidcClaims;
  idToken: string | undefined;
  tokens: SessionTokens;
}

export interface LogoutUrlOptions {
  idToken?: string;
  postLogoutRedirect?: string;
}

/**
 * A *recoverable* callback failure: the session has no pending OIDC transaction, or the callback's
 * `state` does not match the pending one. This is NOT a server fault — it happens on a duplicate/
 * replayed callback or when a concurrent second `/auth/login` overwrote the single-slot transaction
 * (common against a shared IdP with an active SSO session, which bounces the callback back instantly).
 * The controller catches this and restarts the login flow instead of surfacing a 500. Genuine
 * exchange failures (invalid_grant, network, bad claims) are NOT this type — they stay as plain
 * errors so they surface rather than being silently retried into a redirect loop.
 */
export class OidcCallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OidcCallbackError';
  }
}

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

/**
 * Start the Authorization-Code + PKCE flow: generate the PKCE verifier/challenge (S256), state,
 * and nonce, persist them in the session, and return the IdP authorization URL.
 * openid-client v6 is ESM-only, so it is loaded via dynamic `import()` (see oidc.provider.ts).
 */
export async function buildLoginUrl(
  config: Configuration,
  options: OidcLoginOptions,
  session: FlowSession,
): Promise<URL> {
  const oidc = await import('openid-client');
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  session.oidcTx = { state, nonce, codeVerifier };

  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: options.redirectUri,
    scope: (options.scopes ?? DEFAULT_SCOPES).join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });
}

/**
 * Complete the flow on callback: verify state/PKCE/nonce and exchange the code, returning the
 * id-token claims. Fail-closed. Throws a recoverable {@link OidcCallbackError} when there is no
 * pending transaction or the callback `state` does not match the pending one (stale/duplicate/
 * clobbered callback) — the caller restarts login rather than 500ing; a state mismatch does NOT
 * consume the pending transaction, so a concurrent still-valid login can complete. Only a matched
 * transaction is consumed (one-time use), then the code is exchanged.
 */
export async function completeLogin(
  config: Configuration,
  currentUrl: URL,
  session: FlowSession,
): Promise<CompletedLogin> {
  const tx = session.oidcTx;
  if (tx === undefined) {
    // No pending transaction: a duplicate/replayed callback, or one whose transaction was already
    // consumed. Recoverable — the caller restarts the login flow (fail-closed, no 500).
    throw new OidcCallbackError('auth: no OIDC transaction in session (missing state/PKCE)');
  }
  // Match the callback's `state` against the pending transaction. A mismatch means this callback is
  // stale/duplicate, or a concurrent second login overwrote the single-slot transaction with a newer
  // one. Reject as recoverable WITHOUT consuming `oidcTx` — the pending transaction may belong to a
  // newer, still-valid login that must still be able to complete. (state/nonce/PKCE remain
  // cryptographically enforced by the grant below; a forged callback can't guess a valid state.)
  if (currentUrl.searchParams.get('state') !== tx.state) {
    throw new OidcCallbackError(
      'auth: OIDC state mismatch (stale, duplicate, or clobbered callback)',
    );
  }
  // Matched. One-time use: consume the transaction BEFORE the exchange, so a failed callback can't
  // be retried against the same verifier/state/nonce (fail-closed).
  delete session.oidcTx;

  const oidc = await import('openid-client');
  const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: tx.codeVerifier,
    expectedState: tx.state,
    expectedNonce: tx.nonce,
  });

  const claims = tokens.claims();
  if (claims === undefined) {
    throw new Error('auth: token response has no id_token claims');
  }

  return {
    claims: claims as OidcClaims,
    idToken: tokens.id_token,
    tokens: toSessionTokens(tokens),
  };
}

/**
 * Exchange a refresh token for a fresh token set (openid-client `refreshTokenGrant`). Throws when
 * the refresh token is revoked/expired — callers fail closed. Rotation-aware: if the IdP returns
 * no new refresh token, the current one is retained.
 */
export async function refreshTokens(
  config: Configuration,
  refreshToken: string,
): Promise<SessionTokens> {
  const oidc = await import('openid-client');
  const response = await oidc.refreshTokenGrant(config, refreshToken);
  const next = toSessionTokens(response);
  if (next.refreshToken === undefined) {
    next.refreshToken = refreshToken;
  }
  return next;
}

/**
 * Validate a caller-supplied post-login return target. Accepts a *relative path only* — a single
 * leading slash, no scheme, no control characters — so the callback can resolve it against the
 * trusted app origin, making an open redirect structurally impossible. Returns the safe path, or
 * `undefined` when the input is missing or unsafe (the caller then falls back to postLoginRedirect).
 *
 * Rejected vectors: absolute URLs, protocol-relative `//host`, backslash-smuggled `/\host`,
 * embedded schemes (`://`), CRLF/control-char redirect-splitting, non-strings, empty, over-long.
 */
export function sanitizeReturnTo(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) {
    return undefined;
  }
  // Must be a site-relative path: exactly one leading slash (reject `//host` and `/\host`).
  if (raw[0] !== '/' || raw[1] === '/' || raw[1] === '\\') {
    return undefined;
  }
  // No embedded scheme, and no ASCII control chars (blocks CRLF header-splitting).
  // eslint-disable-next-line no-control-regex -- intentionally matching control chars to reject them
  if (raw.includes('://') || /[\u0000-\u001f\u007f]/.test(raw)) {
    return undefined;
  }
  return raw;
}

/**
 * Resolve the final post-login redirect. A stored `returnTo` is re-validated and pinned onto the
 * origin of `postLoginRedirect` (so the browser can only ever land on the app's own origin — an
 * open redirect is impossible even if a full URL somehow reached the session). Anything absent or
 * unsafe falls back to `postLoginRedirect` verbatim.
 */
export function resolvePostLoginTarget(returnTo: unknown, postLoginRedirect: string): string {
  const safe = sanitizeReturnTo(returnTo);
  if (safe === undefined) {
    return postLoginRedirect;
  }
  return new URL(safe, new URL(postLoginRedirect).origin).href;
}

/** Build the IdP `end_session_endpoint` URL for RP-initiated logout. */
export async function buildLogoutUrl(
  config: Configuration,
  options: LogoutUrlOptions,
): Promise<URL> {
  const oidc = await import('openid-client');
  const params: Record<string, string> = {};
  if (options.idToken !== undefined) {
    params.id_token_hint = options.idToken;
  }
  if (options.postLogoutRedirect !== undefined) {
    params.post_logout_redirect_uri = options.postLogoutRedirect;
  }
  return oidc.buildEndSessionUrl(config, params);
}
