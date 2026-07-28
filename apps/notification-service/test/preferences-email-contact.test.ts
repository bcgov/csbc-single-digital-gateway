import { describe, expect, it } from 'vitest';
import { emailContactMissing } from '../src/modules/recipients/util/email-contact';

describe('emailContactMissing (merged-state email requirement, feature 138)', () => {
  it('is false when enabling email together with a contact email', () => {
    expect(
      emailContactMissing(
        { email: 'citizen@example.com', channels: [{ channel: 'email', enabled: true }] },
        { email: null, emailEnabled: false },
      ),
    ).toBe(false);
  });

  it('is true when enabling email with no email in the body and none stored', () => {
    expect(
      emailContactMissing(
        { channels: [{ channel: 'email', enabled: true }] },
        { email: null, emailEnabled: false },
      ),
    ).toBe(true);
  });

  it('is false when enabling email and an address is already stored (toggle-only update)', () => {
    expect(
      emailContactMissing(
        { channels: [{ channel: 'email', enabled: true }] },
        { email: 'stored@example.com', emailEnabled: false },
      ),
    ).toBe(false);
  });

  it('is true when enabling email in the body but clearing the address in the same update', () => {
    expect(
      emailContactMissing(
        { email: null, channels: [{ channel: 'email', enabled: true }] },
        { email: 'stored@example.com', emailEnabled: false },
      ),
    ).toBe(true);
  });

  it('is true when clearing a stored address while email stays enabled (email-only update)', () => {
    expect(
      emailContactMissing({ email: null }, { email: 'stored@example.com', emailEnabled: true }),
    ).toBe(true);
  });

  it('is false when email notifications are (and stay) off', () => {
    expect(emailContactMissing({ email: null }, { email: null, emailEnabled: false })).toBe(false);
    expect(
      emailContactMissing(
        { channels: [{ channel: 'email', enabled: false }] },
        { email: null, emailEnabled: true },
      ),
    ).toBe(false);
  });

  it('treats a blank stored email as missing', () => {
    expect(
      emailContactMissing(
        { channels: [{ channel: 'email', enabled: true }] },
        { email: '   ', emailEnabled: false },
      ),
    ).toBe(true);
  });
});
