import { describe, expect, it } from 'vitest';
import { emailActionFromPayload } from '../src/modules/email-delivery/email-action';

describe('emailActionFromPayload', () => {
  it('extracts a valid absolute http(s) link with its label', () => {
    expect(
      emailActionFromPayload({
        link: 'https://portal.example.com/applications/a1',
        linkLabel: 'View application',
      }),
    ).toEqual({ url: 'https://portal.example.com/applications/a1', label: 'View application' });
    expect(emailActionFromPayload({ link: 'http://localhost:3000/applications/a1' })).toEqual({
      url: 'http://localhost:3000/applications/a1',
      label: 'View details',
    });
  });

  it('returns undefined for absent, relative, or non-http links', () => {
    expect(emailActionFromPayload(null)).toBeUndefined();
    expect(emailActionFromPayload({})).toBeUndefined();
    expect(emailActionFromPayload({ link: '/applications/a1' })).toBeUndefined();
    expect(emailActionFromPayload({ link: 'javascript:alert(1)' })).toBeUndefined();
    expect(emailActionFromPayload({ link: 'ftp://example.com/x' })).toBeUndefined();
    expect(emailActionFromPayload({ link: 42 })).toBeUndefined();
  });
});
