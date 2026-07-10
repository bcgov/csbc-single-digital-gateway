import { describe, expect, it } from 'vitest';
import { createNotificationSchema } from '../src/modules/notifications/dtos/notification.dtos';

const VALID = {
  idempotencyKey: 'app-123:decision:1',
  userId: '11111111-1111-4111-8111-111111111111',
  type: 'application.decision',
  title: 'Your application was approved',
};

describe('createNotificationSchema', () => {
  it('accepts a minimal valid body', () => {
    const parsed = createNotificationSchema.parse(VALID);
    expect(parsed.idempotencyKey).toBe(VALID.idempotencyKey);
    expect(parsed.body).toBeUndefined();
    expect(parsed.email).toBeUndefined();
  });

  it('accepts optional body, payload, and email', () => {
    const parsed = createNotificationSchema.parse({
      ...VALID,
      body: 'Details inside.',
      payload: { link: '/applications/abc' },
      email: 'citizen@example.com',
    });
    expect(parsed.payload).toEqual({ link: '/applications/abc' });
    expect(parsed.email).toBe('citizen@example.com');
  });

  it('rejects a missing idempotencyKey', () => {
    const { idempotencyKey: _drop, ...rest } = VALID;
    expect(createNotificationSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a non-uuid userId', () => {
    expect(createNotificationSchema.safeParse({ ...VALID, userId: 'user-1' }).success).toBe(false);
  });

  it('rejects an empty title and an over-long title', () => {
    expect(createNotificationSchema.safeParse({ ...VALID, title: '' }).success).toBe(false);
    expect(createNotificationSchema.safeParse({ ...VALID, title: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('rejects an invalid email', () => {
    expect(createNotificationSchema.safeParse({ ...VALID, email: 'not-an-email' }).success).toBe(
      false,
    );
  });
});
