import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { M2mTokenClient } from '../../../src/notifications/m2m-token.client';

describe('M2mTokenClient Unit Tests', () => {
  let client: M2mTokenClient;
  const options = {
    issuer: 'http://auth.issuer',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };

  beforeEach(() => {
    client = new M2mTokenClient(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully request and cache token', async () => {
    const mockTokenResponse = {
      access_token: 'token-123',
      expires_in: 300,
    };
    const responseMock = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockTokenResponse),
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

    // First call: should fetch token
    const token1 = await client.getToken();
    expect(token1).toBe('token-123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('protocol/openid-connect/token', 'http://auth.issuer/'),
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

    // Second call: should use cached token
    const token2 = await client.getToken();
    expect(token2).toBe('token-123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should format issuer base url with trailing slash if not present', async () => {
    const customClient = new M2mTokenClient({
      ...options,
      issuer: 'http://auth.issuer/custom/',
    });
    const responseMock = {
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 60 }),
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

    await customClient.getToken();
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('protocol/openid-connect/token', 'http://auth.issuer/custom/'),
      expect.any(Object),
    );
  });

  it('should throw an error if response is not ok', async () => {
    const responseMock = {
      ok: false,
      status: 400,
    } as unknown as Response;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

    await expect(client.getToken()).rejects.toThrow('m2m token request failed: 400');
  });

  it('should throw an error if access_token is missing or empty in json response', async () => {
    const responseMock = {
      ok: true,
      json: vi.fn().mockResolvedValue({ expires_in: 300 }),
    } as unknown as Response;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

    await expect(client.getToken()).rejects.toThrow('m2m token response missing access_token');
  });

  it('should invalidate cache and force refetch on invalidate()', async () => {
    const responseMock1 = {
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'token-1', expires_in: 300 }),
    } as unknown as Response;

    const responseMock2 = {
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'token-2', expires_in: 300 }),
    } as unknown as Response;

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(responseMock1)
      .mockResolvedValueOnce(responseMock2);

    const tok1 = await client.getToken();
    expect(tok1).toBe('token-1');

    client.invalidate();

    const tok2 = await client.getToken();
    expect(tok2).toBe('token-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should refresh token when it is close to expiry', async () => {
    const responseMock1 = {
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'token-1', expires_in: 60 }), // expires in 60s
    } as unknown as Response;

    const responseMock2 = {
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'token-2', expires_in: 60 }),
    } as unknown as Response;

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(responseMock1)
      .mockResolvedValueOnce(responseMock2);

    const now = Date.now();
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

    const tok1 = await client.getToken();
    expect(tok1).toBe('token-1');

    // Fast forward by 31 seconds. Expiry skew is 30s. So 60s - 31s = 29s remaining, which is within skew.
    dateSpy.mockReturnValue(now + 31 * 1000);

    const tok2 = await client.getToken();
    expect(tok2).toBe('token-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should fall back to 60 seconds expiry if expires_in is missing in token response', async () => {
    const mockTokenResponse = {
      access_token: 'token-fallback',
    };
    const responseMock = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockTokenResponse),
    } as unknown as Response;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseMock);

    const token = await client.getToken();
    expect(token).toBe('token-fallback');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const tokenCached = await client.getToken();
    expect(tokenCached).toBe('token-fallback');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
