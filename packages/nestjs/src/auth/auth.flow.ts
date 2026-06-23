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
 * id-token claims. Fail-closed — throws if the session has no transaction. Clears the
 * transaction on success.
 */
export async function completeLogin(
  config: Configuration,
  currentUrl: URL,
  session: FlowSession,
): Promise<CompletedLogin> {
  const tx = session.oidcTx;
  if (tx === undefined) {
    throw new Error('auth: no OIDC transaction in session (missing state/PKCE)');
  }
  // One-time use: consume the transaction BEFORE the exchange, so a failed or replayed callback
  // can't be retried against the same verifier/state/nonce (fail-closed).
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
