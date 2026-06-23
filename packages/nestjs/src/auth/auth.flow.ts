import type { Configuration } from 'openid-client';

import type { OidcClaims } from './auth.types';

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
): Promise<OidcClaims> {
  const tx = session.oidcTx;
  if (tx === undefined) {
    throw new Error('auth: no OIDC transaction in session (missing state/PKCE)');
  }

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

  delete session.oidcTx;
  return claims as OidcClaims;
}
