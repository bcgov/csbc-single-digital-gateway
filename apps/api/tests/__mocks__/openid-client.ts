/**
 * Mock for openid-client v6 (ESM-only package).
 * Provides CJS-compatible stubs so Jest can import it without ESM support.
 */

export const discovery = jest.fn().mockResolvedValue({});
export const ClientSecretPost = jest.fn().mockReturnValue('client_secret_post');

export const randomPKCECodeVerifier = jest
  .fn()
  .mockReturnValue('mock-code-verifier');
export const calculatePKCECodeChallenge = jest
  .fn()
  .mockResolvedValue('mock-code-challenge');
export const randomState = jest.fn().mockReturnValue('mock-state');

export const buildAuthorizationUrl = jest
  .fn()
  .mockReturnValue(new URL('https://idp.example.com/authorize'));
export const buildEndSessionUrl = jest
  .fn()
  .mockReturnValue(new URL('https://idp.example.com/logout'));

export const authorizationCodeGrant = jest.fn().mockResolvedValue({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  id_token: 'mock-id-token',
  claims: () => ({ sub: 'mock-sub' }),
  expiresIn: () => 3600,
});

export const refreshTokenGrant = jest.fn().mockResolvedValue({
  access_token: 'mock-refreshed-access-token',
  refresh_token: 'mock-refreshed-refresh-token',
  id_token: 'mock-refreshed-id-token',
  claims: () => ({ sub: 'mock-sub' }),
  expiresIn: () => 3600,
});
