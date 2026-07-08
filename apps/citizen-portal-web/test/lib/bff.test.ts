import { describe, expect, it } from 'vitest';
import { loginUrl, loginUrlFor } from '@/lib/bff';

// loginUrlFor carries the current page path across the OIDC round-trip so a citizen who clicks
// "Log in" lands back where they started (feature 67). The path is URL-encoded into `returnTo`.
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
