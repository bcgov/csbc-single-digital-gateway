import type { JWTVerifyGetKey } from 'jose';

import type { M2mAuthModuleOptions, M2mPrincipal, M2mTokenVerifier } from './m2m-auth.types';

/**
 * JWKS-backed verifier for client-credentials bearer JWTs.
 *
 * Discovery (`{issuer}/.well-known/openid-configuration` → `jwks_uri`) runs lazily on the
 * FIRST verify — the app boots without a reachable IdP (same laziness as `createDatabase`).
 * jose's `createRemoteJWKSet` caches keys and handles rotation. `jwtVerify` enforces the
 * signature, `exp`/`nbf`, `iss`, and that `aud` contains the required audience.
 *
 * jose is ESM-only and `@repo/nestjs` is CommonJS, so it is loaded via dynamic `import()` —
 * the same TS1479 pattern as openid-client in `auth/oidc.provider.ts`.
 */
export class OidcJwtVerifier implements M2mTokenVerifier {
  private jwks: Promise<JWTVerifyGetKey> | undefined;

  constructor(private readonly options: Pick<M2mAuthModuleOptions, 'issuer' | 'audience'>) {}

  async verify(token: string): Promise<M2mPrincipal> {
    const jwks = await this.getJwks();
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, jwks, {
      issuer: this.options.issuer,
      audience: this.options.audience,
    });
    const azp = typeof payload.azp === 'string' ? payload.azp : undefined;
    const clientId = azp ?? (typeof payload.client_id === 'string' ? payload.client_id : undefined);
    return { clientId, subject: payload.sub, claims: payload };
  }

  private getJwks(): Promise<JWTVerifyGetKey> {
    // Don't cache a failed discovery — a transient IdP outage must not poison every
    // subsequent verify until restart.
    this.jwks ??= this.loadJwks().catch((error: unknown) => {
      this.jwks = undefined;
      throw error;
    });
    return this.jwks;
  }

  private async loadJwks(): Promise<JWTVerifyGetKey> {
    const issuerBase = this.options.issuer.endsWith('/')
      ? this.options.issuer
      : `${this.options.issuer}/`;
    // JWKS location comes from the CONFIGURED issuer only — never from request data.
    const discoveryUrl = new URL('.well-known/openid-configuration', issuerBase);
    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      throw new Error(`OIDC discovery failed: ${response.status} from ${discoveryUrl.href}`);
    }
    const metadata = (await response.json()) as { jwks_uri?: string };
    if (typeof metadata.jwks_uri !== 'string' || metadata.jwks_uri === '') {
      throw new Error('OIDC discovery: metadata has no jwks_uri');
    }
    const { createRemoteJWKSet } = await import('jose');
    return createRemoteJWKSet(new URL(metadata.jwks_uri));
  }
}
