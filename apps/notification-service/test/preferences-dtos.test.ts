import { describe, expect, it } from 'vitest';
import { updatePreferencesSchema } from '../src/modules/recipients/dtos/preferences.dtos';

describe('updatePreferencesSchema', () => {
  it('accepts an empty object (nothing to change)', () => {
    const parsed = updatePreferencesSchema.parse({});
    expect(parsed.email).toBeUndefined();
    expect(parsed.channels).toBeUndefined();
  });

  it('accepts togglable channel entries and an email', () => {
    const parsed = updatePreferencesSchema.parse({
      email: 'citizen@example.com',
      channels: [{ channel: 'email', enabled: false }],
    });
    expect(parsed.channels).toHaveLength(1);
  });

  it('rejects in_app entries — the channel is mandatory and not a preference (feature 128)', () => {
    expect(
      updatePreferencesSchema.safeParse({ channels: [{ channel: 'in_app', enabled: false }] })
        .success,
    ).toBe(false);
    expect(
      updatePreferencesSchema.safeParse({ channels: [{ channel: 'in_app', enabled: true }] })
        .success,
    ).toBe(false);
  });

  it('accepts email: null (clears the address)', () => {
    expect(updatePreferencesSchema.parse({ email: null }).email).toBeNull();
  });

  it('rejects an invalid email', () => {
    expect(updatePreferencesSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('rejects an unknown channel', () => {
    expect(
      updatePreferencesSchema.safeParse({ channels: [{ channel: 'sms', enabled: true }] }).success,
    ).toBe(false);
  });

  it('rejects duplicate channel entries', () => {
    expect(
      updatePreferencesSchema.safeParse({
        channels: [
          { channel: 'email', enabled: true },
          { channel: 'email', enabled: false },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects a non-boolean enabled', () => {
    expect(
      updatePreferencesSchema.safeParse({ channels: [{ channel: 'email', enabled: 'yes' }] })
        .success,
    ).toBe(false);
  });
});
