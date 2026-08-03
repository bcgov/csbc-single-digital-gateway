import { describe, expect, it } from 'vitest';
import {
  feedQuerySchema,
  feedItemSchema,
  feedResponseSchema,
  unreadCountSchema,
  readAllResponseSchema,
  updatePreferencesSchema,
  preferencesResponseSchema,
} from '../../../../../src/modules/notifications/dtos/notification.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

describe('notification DTO schemas', () => {
  describe('feedQuerySchema', () => {
    it('applies default limit and offset when empty', () => {
      const parsed = feedQuerySchema.parse({});
      expect(parsed).toEqual({ limit: 20, offset: 0 });
    });

    it('coerces strings and enforces ranges', () => {
      const parsed = feedQuerySchema.parse({ limit: '50', offset: '10' });
      expect(parsed).toEqual({ limit: 50, offset: 10 });
    });

    it('rejects values outside of range limits', () => {
      expect(feedQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(feedQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(feedQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });

  describe('feedItemSchema', () => {
    it('validates a correct feed item structure', () => {
      const payload = {
        deliveryId: VALID_UUID,
        notificationId: VALID_UUID,
        type: 'test-type',
        title: 'Test Notification',
        body: 'This is a test notification body',
        payload: { key: 'value' },
        createdAt: '2026-07-28T10:20:00.000Z',
        readAt: null,
      };
      const parsed = feedItemSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('rejects when invalid UUID is provided', () => {
      const payload = {
        deliveryId: 'invalid-uuid',
        notificationId: VALID_UUID,
        type: 'test-type',
        title: 'Test Notification',
        body: null,
        payload: null,
        createdAt: '2026-07-28T10:20:00.000Z',
        readAt: null,
      };
      expect(feedItemSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('feedResponseSchema', () => {
    it('validates a correct feed response structure', () => {
      const payload = {
        items: [
          {
            deliveryId: VALID_UUID,
            notificationId: VALID_UUID,
            type: 'test-type',
            title: 'Test Notification',
            body: null,
            payload: null,
            createdAt: '2026-07-28T10:20:00.000Z',
            readAt: null,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };
      const parsed = feedResponseSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('rejects negative total count', () => {
      const payload = {
        items: [],
        total: -1,
        limit: 20,
        offset: 0,
      };
      expect(feedResponseSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('unreadCountSchema', () => {
    it('validates a positive count', () => {
      const parsed = unreadCountSchema.parse({ count: 5 });
      expect(parsed).toEqual({ count: 5 });
    });

    it('rejects negative count', () => {
      expect(unreadCountSchema.safeParse({ count: -1 }).success).toBe(false);
    });
  });

  describe('readAllResponseSchema', () => {
    it('validates correct updated count response', () => {
      const parsed = readAllResponseSchema.parse({ updated: 10 });
      expect(parsed).toEqual({ updated: 10 });
    });

    it('rejects negative updated count', () => {
      expect(readAllResponseSchema.safeParse({ updated: -5 }).success).toBe(false);
    });
  });

  describe('updatePreferencesSchema', () => {
    it('validates valid updates containing email and channels toggles', () => {
      const payload = {
        email: 'user@example.com',
        channels: [{ channel: 'email', enabled: true }],
      };
      const parsed = updatePreferencesSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('rejects duplicate channel entries', () => {
      const payload = {
        channels: [
          { channel: 'email', enabled: true },
          { channel: 'email', enabled: false },
        ],
      };
      expect(updatePreferencesSchema.safeParse(payload).success).toBe(false);
    });

    it('rejects invalid email formats', () => {
      const payload = {
        email: 'invalid-email',
      };
      expect(updatePreferencesSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('preferencesResponseSchema', () => {
    it('validates a correct preference response structure', () => {
      const payload = {
        userId: VALID_UUID,
        email: 'user@example.com',
        channels: [{ channel: 'in_app', enabled: true }],
      };
      const parsed = preferencesResponseSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });
});
