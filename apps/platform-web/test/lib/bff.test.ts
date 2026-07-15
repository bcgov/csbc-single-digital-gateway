import { describe, expect, it } from 'vitest';
import { loginUrl, loginUrlFor } from '@/lib/bff';

// loginUrlFor carries the current in-app path across the OIDC round-trip so the user lands back
// where they started (feature 67). The path is URL-encoded into a `returnTo` query param.
describe('loginUrlFor', () => {
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
