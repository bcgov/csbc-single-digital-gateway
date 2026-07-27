export interface M2mTokenClientOptions {
  /** The realm hosting the m2m clients (the sdg realm — NOT necessarily this app's login issuer). */
  issuer: string;
  clientId: string;
  clientSecret: string;
}

// Refresh when within this window of expiry so an in-flight request never carries a token
// that dies mid-call.
const EXPIRY_SKEW_MS = 30_000;

/**
 * Cached OIDC client-credentials tokens for calling the notification-service. Plain
 * token-endpoint fetch (no openid-client — the grant is one POST), token held in memory
 * only. `invalidate()` drops the cache (call it on a downstream 401 so the next tick
 * re-authenticates instead of retrying a revoked token).
 */
export class M2mTokenClient {
  private cached: { token: string; expiresAt: number } | undefined;

  constructor(private readonly options: M2mTokenClientOptions) {}

  async getToken(): Promise<string> {
    if (this.cached !== undefined && Date.now() < this.cached.expiresAt - EXPIRY_SKEW_MS) {
      return this.cached.token;
    }
    const issuerBase = this.options.issuer.endsWith('/')
      ? this.options.issuer
      : `${this.options.issuer}/`;
    const response = await fetch(new URL('protocol/openid-connect/token', issuerBase), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`m2m token request failed: ${response.status}`);
    }
    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (typeof json.access_token !== 'string' || json.access_token === '') {
      throw new Error('m2m token response missing access_token');
    }
    this.cached = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 60) * 1000,
    };
    return this.cached.token;
  }

  invalidate(): void {
    this.cached = undefined;
  }
}
