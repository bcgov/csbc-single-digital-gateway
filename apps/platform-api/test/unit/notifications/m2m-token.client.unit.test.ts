import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { M2mTokenClient } from '../../../src/notifications/m2m-token.client';

const OPTIONS = {
  issuer: 'http://localhost:8080/realms/sdg',
  clientId: 'platform-api-m2m',
  clientSecret: 'test-secret',
};

function tokenResponse(token: string, expiresIn: number): Response {
  return new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('M2mTokenClient', () => {
  let client: M2mTokenClient;
  const options = {
    issuer: 'https://keycloak.example.com/auth/realms/sdg',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };

  beforeEach(() => {
    client = new M2mTokenClient(options);
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fetches and caches token successfully on first call', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'mocked-jwt-token',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const token = await client.getToken();

    expect(token).toBe('mocked-jwt-token');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      new URL('https://keycloak.example.com/auth/realms/sdg/protocol/openid-connect/token'),
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client',
          client_secret: 'test-secret',
        }).toString(),
      },
    );
  });

  it('returns cached token on subsequent calls if not expired', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'cached-token',
        expires_in: 300, // 300s = 5 minutes
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    // Initial fetch
    await client.getToken();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Forward time by 2 minutes (120,000ms), still well within 5 mins - 30s skew
    await vi.advanceTimersByTimeAsync(120_000);

    const token = await client.getToken();
    expect(token).toBe('cached-token');
    expect(fetch).toHaveBeenCalledTimes(1); // cache hit
  });

  it('refetches token if cached token is expired or close to expiry skew', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'expired-token',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    // Initial fetch
    await client.getToken();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Forward time by 4 minutes and 40 seconds (280,000ms), which exceeds the 30s skew window (300 - 30 = 270s)
    await vi.advanceTimersByTimeAsync(280_000);

    // Next mock response for refresh
    const mockResponseNew = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new-token',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponseNew as any);

    const token = await client.getToken();
    expect(token).toBe('new-token');
    expect(fetch).toHaveBeenCalledTimes(2); // refetched
  });

  it('throws error if the token endpoint returns non-ok status', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(client.getToken()).rejects.toThrow('m2m token request failed: 400');
  });

  it('throws error if the response is missing access_token', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(client.getToken()).rejects.toThrow('m2m token response missing access_token');
  });

  it('refetches token after invalidate() is called', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'token-1',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await client.getToken();
    expect(fetch).toHaveBeenCalledTimes(1);

    client.invalidate();

    const mockResponseNew = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'token-2',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponseNew as any);

    const token = await client.getToken();
    expect(token).toBe('token-2');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('handles issuer ending with slash', async () => {
    const slashClient = new M2mTokenClient({
      ...options,
      issuer: 'https://keycloak.example.com/auth/realms/sdg/',
    });
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'mocked-jwt-token',
        expires_in: 300,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await slashClient.getToken();
    expect(fetch).toHaveBeenCalledWith(
      new URL('https://keycloak.example.com/auth/realms/sdg/protocol/openid-connect/token'),
      expect.anything(),
    );
  });

  it('falls back to default expiry when expires_in is missing', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'mocked-jwt-token-no-expiry',
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const token = await client.getToken();
    expect(token).toBe('mocked-jwt-token-no-expiry');
  });

  it('fetches a token from the issuer token endpoint with client credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse('tok-1', 300));
    const localClient = new M2mTokenClient(OPTIONS);

    const token = await localClient.getToken();
    expect(token).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit];
    expect(String(url)).toBe('http://localhost:8080/realms/sdg/protocol/openid-connect/token');
    expect(String(init.body)).toContain('grant_type=client_credentials');
    expect(String(init.body)).toContain('client_id=platform-api-m2m');
  });

  it('caches the token until near expiry, then refreshes', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse('tok-1', 300))
      .mockResolvedValueOnce(tokenResponse('tok-2', 300));
    const localClient = new M2mTokenClient(OPTIONS);

    expect(await localClient.getToken()).toBe('tok-1');
    expect(await localClient.getToken()).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Within the 30s expiry skew → refresh.
    vi.advanceTimersByTime(280_000);
    expect(await localClient.getToken()).toBe('tok-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidate() drops the cache so the next call re-authenticates', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse('tok-1', 300))
      .mockResolvedValueOnce(tokenResponse('tok-2', 300));
    const localClient = new M2mTokenClient(OPTIONS);

    expect(await localClient.getToken()).toBe('tok-1');
    localClient.invalidate();
    expect(await localClient.getToken()).toBe('tok-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-2xx token response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"invalid_client"}', { status: 401 }),
    );
    const localClient = new M2mTokenClient(OPTIONS);
    await expect(localClient.getToken()).rejects.toThrow(/token/i);
  });
});
