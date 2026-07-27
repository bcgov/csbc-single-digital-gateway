import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { JWK } from 'jose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { OidcJwtVerifier } from '../src/m2m-auth/m2m-auth.verifier';

const ISSUER = 'https://idp.example.test/realms/std';
const JWKS_URI = 'https://idp.example.test/realms/std/protocol/openid-connect/certs';

let privateKey: CryptoKey;
let publicJwk: JWK;

/** Serve OIDC discovery + the JWKS from the stubbed global fetch — no network, no IdP. */
function stubIdpFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url === `${ISSUER}/.well-known/openid-configuration`) {
        return new Response(JSON.stringify({ issuer: ISSUER, jwks_uri: JWKS_URI }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url === JWKS_URI) {
        return new Response(JSON.stringify({ keys: [{ ...publicJwk, alg: 'RS256' }] }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
}

async function signToken(aud: string | string[]): Promise<string> {
  return new SignJWT({ azp: 'caller-client' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setSubject('service-account-caller')
    .setIssuedAt()
    .setExpirationTime('2m')
    .sign(privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  publicJwk = await exportJWK(pair.publicKey);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OidcJwtVerifier audience enforcement', () => {
  it('accepts a token whose aud contains the single configured audience', async () => {
    stubIdpFetch();
    const verifier = new OidcJwtVerifier({ issuer: ISSUER, audience: 'notification-service' });
    const principal = await verifier.verify(await signToken(['notification-service', 'account']));
    expect(principal.clientId).toBe('caller-client');
    expect(principal.subject).toBe('service-account-caller');
  });

  it('rejects a token missing the single configured audience', async () => {
    stubIdpFetch();
    const verifier = new OidcJwtVerifier({ issuer: ISSUER, audience: 'notification-service' });
    await expect(verifier.verify(await signToken('some-other-service'))).rejects.toThrow();
  });

  // ANY-of list: for IdPs where a custom audience mapper is unavailable (e.g. the CSS standard
  // realm) each caller's token carries only its own client id as aud — the verifier must accept
  // a token matching ANY configured audience and still reject everything else.
  it('accepts tokens carrying ANY audience of a configured list', async () => {
    stubIdpFetch();
    const verifier = new OidcJwtVerifier({
      issuer: ISSUER,
      audience: ['platform-api-m2m', 'citizen-portal-api-m2m'],
    });
    await expect(verifier.verify(await signToken('platform-api-m2m'))).resolves.toMatchObject({
      clientId: 'caller-client',
    });
    await expect(
      verifier.verify(await signToken(['citizen-portal-api-m2m'])),
    ).resolves.toMatchObject({ clientId: 'caller-client' });
  });

  it('rejects a token matching NO audience of a configured list', async () => {
    stubIdpFetch();
    const verifier = new OidcJwtVerifier({
      issuer: ISSUER,
      audience: ['platform-api-m2m', 'citizen-portal-api-m2m'],
    });
    await expect(verifier.verify(await signToken('staff-login-client'))).rejects.toThrow();
  });

  it('rejects a wrong-issuer token even with a matching audience', async () => {
    stubIdpFetch();
    const verifier = new OidcJwtVerifier({ issuer: ISSUER, audience: 'notification-service' });
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer('https://other-idp.example.test/realms/std')
      .setAudience('notification-service')
      .setExpirationTime('2m')
      .sign(privateKey);
    await expect(verifier.verify(foreign)).rejects.toThrow();
  });
});
