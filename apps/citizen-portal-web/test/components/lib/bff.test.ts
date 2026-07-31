import { describe, expect, it, vi } from 'vitest';
import { loginUrl, loginUrlFor, getMe, logout, displayName, type AuthUser } from '@/lib/bff';

// Helper to make json response
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

// loginUrlFor carries the current page path across the OIDC round-trip so a citizen who clicks
// "Log in" lands back where they started (feature 67). The path is URL-encoded into `returnTo`.
describe('BFF_ORIGIN resolution', () => {
  it('resolves BFF_ORIGIN from window.__APP_CONFIG__ if available', async () => {
    vi.resetModules();
    const originalConfig = (globalThis as any).window.__APP_CONFIG__;
    (globalThis as any).window.__APP_CONFIG__ = { bffOrigin: 'http://window-config-origin' };

    const { BFF_ORIGIN } = await import('@/lib/bff');
    expect(BFF_ORIGIN).toBe('http://window-config-origin');

    // Restore
    if (originalConfig) {
      (globalThis as any).window.__APP_CONFIG__ = originalConfig;
    } else {
      delete (globalThis as any).window.__APP_CONFIG__;
    }
  });

  it('falls back to default localhost URL if window config and env variable are missing', async () => {
    vi.resetModules();
    const originalEnv = import.meta.env.VITE_BFF_ORIGIN;
    (import.meta.env as any).VITE_BFF_ORIGIN = '';
    const originalConfig = (globalThis as any).window.__APP_CONFIG__;
    (globalThis as any).window.__APP_CONFIG__ = undefined;

    const { BFF_ORIGIN } = await import('@/lib/bff');
    expect(BFF_ORIGIN).toBe('http://localhost:4000');

    // Restore
    (import.meta.env as any).VITE_BFF_ORIGIN = originalEnv;
    if (originalConfig) {
      (globalThis as any).window.__APP_CONFIG__ = originalConfig;
    }
  });
});

describe('loginUrlFor', () => {
  it('appends the path as an encoded returnTo query param', () => {
    expect(loginUrlFor('/services/passport')).toBe(
      `${loginUrl}?returnTo=${encodeURIComponent('/services/passport')}`,
    );
  });

  it('encodes slashes and query characters in the path', () => {
    const url = new URL(loginUrlFor('/applications/7?view=summary'));
    expect(url.searchParams.get('returnTo')).toBe('/applications/7?view=summary');
  });
});

describe('getMe', () => {
  it('returns AuthUser if fetch is successful', async () => {
    const mockUser: AuthUser = {
      id: 'usr_123',
      roles: ['citizen'],
      claims: { sub: 'usr_123', name: 'Alice' },
    };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(mockUser));

    const user = await getMe();
    expect(user).toEqual(mockUser);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), {
      credentials: 'include',
    });
  });

  it('returns null on 401 status code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));

    const user = await getMe();
    expect(user).toBeNull();
  });

  it('throws an error on other non-ok status codes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));

    try {
      await getMe();
      expect.fail('should have thrown');
    } catch (e: any) {
      expect(e.message).toBe('GET /auth/me failed: 500');
    }
  });
});

describe('logout', () => {
  it('sends POST logout request with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await logout();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
  });
});

describe('displayName', () => {
  const baseUser: AuthUser = {
    id: 'usr_123',
    roles: [],
    claims: { sub: 'usr_123' },
  };

  it('prefers claims.name', () => {
    const user = {
      ...baseUser,
      claims: {
        ...baseUser.claims,
        name: 'Alice',
        preferred_username: 'alice123',
        email: 'alice@example.com',
      },
    };
    expect(displayName(user)).toBe('Alice');
  });

  it('falls back to claims.preferred_username if name is missing', () => {
    const user = {
      ...baseUser,
      claims: { ...baseUser.claims, preferred_username: 'alice123', email: 'alice@example.com' },
    };
    expect(displayName(user)).toBe('alice123');
  });

  it('falls back to claims.email if name and preferred_username are missing', () => {
    const user = {
      ...baseUser,
      claims: { ...baseUser.claims, email: 'alice@example.com' },
    };
    expect(displayName(user)).toBe('alice@example.com');
  });

  it('falls back to user.id if all claims are missing', () => {
    expect(displayName(baseUser)).toBe('usr_123');
  });
});
