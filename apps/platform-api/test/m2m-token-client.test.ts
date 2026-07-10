import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { M2mTokenClient } from '../src/notifications/m2m-token.client';

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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches a token from the issuer token endpoint with client credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse('tok-1', 300));
    const client = new M2mTokenClient(OPTIONS);

    const token = await client.getToken();
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
    const client = new M2mTokenClient(OPTIONS);

    expect(await client.getToken()).toBe('tok-1');
    expect(await client.getToken()).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Within the 30s expiry skew → refresh.
    vi.advanceTimersByTime(280_000);
    expect(await client.getToken()).toBe('tok-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidate() drops the cache so the next call re-authenticates', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse('tok-1', 300))
      .mockResolvedValueOnce(tokenResponse('tok-2', 300));
    const client = new M2mTokenClient(OPTIONS);

    expect(await client.getToken()).toBe('tok-1');
    client.invalidate();
    expect(await client.getToken()).toBe('tok-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-2xx token response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"invalid_client"}', { status: 401 }),
    );
    const client = new M2mTokenClient(OPTIONS);
    await expect(client.getToken()).rejects.toThrow(/token/i);
  });
});
