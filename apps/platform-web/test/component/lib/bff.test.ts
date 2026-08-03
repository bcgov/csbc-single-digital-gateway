import { describe, expect, it, vi, afterEach } from 'vitest';
import { loginUrl, loginUrlFor, getMe, logout, displayName } from '@/lib/bff';

// loginUrlFor carries the current in-app path across the OIDC round-trip so the user lands back
// where they started (feature 67). The path is URL-encoded into a `returnTo` query param.
describe('BFF Unit Test Suite', () => {
  it('appends the path as an encoded returnTo query param', () => {
    expect(loginUrlFor('/app/services/42')).toBe(
      `${loginUrl}?returnTo=${encodeURIComponent('/app/services/42')}`,
    );
  });

  it('encodes slashes and query characters in the path', () => {
    const url = new URL(loginUrlFor('/app/services/42?tab=details'));
    expect(url.searchParams.get('returnTo')).toBe('/app/services/42?tab=details');
  });
});

describe('displayName', () => {
  it('falls back correctly across user claims details', () => {
    const userWithName = {
      id: 'u1',
      roles: [],
      claims: { sub: 'u1', name: 'John Doe' },
    };
    expect(displayName(userWithName)).toBe('John Doe');

    const userWithUsername = {
      id: 'u2',
      roles: [],
      claims: { sub: 'u2', preferred_username: 'johndoe' },
    };
    expect(displayName(userWithUsername)).toBe('johndoe');

    const userWithEmail = {
      id: 'u3',
      roles: [],
      claims: { sub: 'u3', email: 'john@example.com' },
    };
    expect(displayName(userWithEmail)).toBe('john@example.com');

    const userOpaque = {
      id: 'u4',
      roles: [],
      claims: { sub: 'u4' },
    };
    expect(displayName(userOpaque)).toBe('u4');
  });
});

describe('getMe', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns AuthUser object on successful response', async () => {
    const mockUser = {
      id: 'usr-1',
      roles: ['user'],
      claims: { sub: 'usr-1', name: 'Alice' },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockUser,
    } as Response);

    const user = await getMe();
    expect(user).toEqual(mockUser);
  });

  it('returns null on 401 unauthorized status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    const user = await getMe();
    expect(user).toBeNull();
  });

  it('throws an error on failure response codes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    } as Response);

    let thrown: Error | undefined;
    try {
      await getMe();
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown).toBeDefined();
    expect(thrown?.message).toContain('GET /auth/me failed: 500');
  });
});

describe('logout', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('posts a logout request to the server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    } as Response);
    globalThis.fetch = fetchMock;

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });
});

describe('BFF_ORIGIN resolution', () => {
  it('resolves BFF_ORIGIN from various config sources', async () => {
    const originalConfig = (window as any).__APP_CONFIG__;

    try {
      // 1. Resolve from window.__APP_CONFIG__.bffOrigin
      vi.resetModules();
      (window as any).__APP_CONFIG__ = { bffOrigin: 'http://window-origin' };
      const mod1 = await import('@/lib/bff');
      expect(mod1.BFF_ORIGIN).toBe('http://window-origin');

      // 2. Resolve from env
      vi.resetModules();
      (window as any).__APP_CONFIG__ = undefined;
      vi.stubEnv('VITE_BFF_ORIGIN', 'http://env-origin');
      const mod2 = await import('@/lib/bff');
      expect(mod2.BFF_ORIGIN).toBe('http://env-origin');

      // 3. Fallback to default
      vi.resetModules();
      vi.stubEnv('VITE_BFF_ORIGIN', '');
      const mod3 = await import('@/lib/bff');
      expect(mod3.BFF_ORIGIN).toBe('http://localhost:4001');
    } finally {
      (window as any).__APP_CONFIG__ = originalConfig;
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
