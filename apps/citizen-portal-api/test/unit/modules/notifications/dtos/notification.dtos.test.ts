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

const VALID_UUID_1 = '11111111-1111-4111-8111-111111111111';
const VALID_UUID_2 = '22222222-2222-4222-8222-222222222222';

describe('notification DTO schemas', () => {
  describe('feedQuerySchema', () => {
    it('should parse valid limit and offset', () => {
      const result = feedQuerySchema.safeParse({ limit: 10, offset: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ limit: 10, offset: 5 });
      }
    });

    it('should fall back to defaults when limit and offset are omitted', () => {
      const result = feedQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ limit: 20, offset: 0 });
      }
    });

    it('should coerce strings to numbers', () => {
      const result = feedQuerySchema.safeParse({ limit: '15', offset: '2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ limit: 15, offset: 2 });
      }
    });

    it('should fail if limit is less than 1 or greater than 100', () => {
      expect(feedQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(feedQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('should fail if offset is less than 0', () => {
      expect(feedQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
    });
  });

  describe('feedItemSchema', () => {
    const validFeedItem = {
      deliveryId: VALID_UUID_1,
      notificationId: VALID_UUID_2,
      type: 'test-notification',
      title: 'Test Notification',
      body: 'This is a test notification body',
      payload: { key: 'value' },
      createdAt: '2026-07-27T08:56:29Z',
      readAt: null,
    };

    it('should parse a valid feed item', () => {
      const result = feedItemSchema.safeParse(validFeedItem);
      expect(result.success).toBe(true);
    });

    it('should allow nullable body and payload', () => {
      const result = feedItemSchema.safeParse({
        ...validFeedItem,
        body: null,
        payload: null,
      });
      expect(result.success).toBe(true);
    });

    it('should fail if deliveryId or notificationId is not a valid UUID', () => {
      expect(
        feedItemSchema.safeParse({
          ...validFeedItem,
          deliveryId: 'not-a-uuid',
        }).success,
      ).toBe(false);

      expect(
        feedItemSchema.safeParse({
          ...validFeedItem,
          notificationId: 'not-a-uuid',
        }).success,
      ).toBe(false);
    });
  });

  describe('feedResponseSchema', () => {
    const validFeedResponse = {
      items: [
        {
          deliveryId: VALID_UUID_1,
          notificationId: VALID_UUID_2,
          type: 'test-notification',
          title: 'Test Notification',
          body: null,
          payload: null,
          createdAt: '2026-07-27T08:56:29Z',
          readAt: null,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };

    it('should parse a valid feed response', () => {
      const result = feedResponseSchema.safeParse(validFeedResponse);
      expect(result.success).toBe(true);
    });

    it('should fail if total is negative', () => {
      expect(
        feedResponseSchema.safeParse({
          ...validFeedResponse,
          total: -1,
        }).success,
      ).toBe(false);
    });
  });

  describe('unreadCountSchema', () => {
    it('should parse a valid unread count', () => {
      expect(unreadCountSchema.safeParse({ count: 5 }).success).toBe(true);
      expect(unreadCountSchema.safeParse({ count: 0 }).success).toBe(true);
    });

    it('should fail if count is negative or not an integer', () => {
      expect(unreadCountSchema.safeParse({ count: -1 }).success).toBe(false);
      expect(unreadCountSchema.safeParse({ count: 1.5 }).success).toBe(false);
    });
  });

  describe('readAllResponseSchema', () => {
    it('should parse a valid read all response', () => {
      expect(readAllResponseSchema.safeParse({ updated: 10 }).success).toBe(true);
      expect(readAllResponseSchema.safeParse({ updated: 0 }).success).toBe(true);
    });

    it('should fail if updated is negative or not an integer', () => {
      expect(readAllResponseSchema.safeParse({ updated: -1 }).success).toBe(false);
      expect(readAllResponseSchema.safeParse({ updated: 1.5 }).success).toBe(false);
    });
  });

  describe('updatePreferencesSchema', () => {
    it('should parse valid update preferences data', () => {
      const result = updatePreferencesSchema.safeParse({
        email: 'test@example.com',
        channels: [{ channel: 'email', enabled: true }],
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional email and channels', () => {
      expect(updatePreferencesSchema.safeParse({}).success).toBe(true);
      expect(updatePreferencesSchema.safeParse({ email: null }).success).toBe(true);
    });

    it('should fail if email format is invalid', () => {
      expect(updatePreferencesSchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
    });

    it('should fail if channel is not togglable (e.g. in_app is not allowed on write)', () => {
      expect(
        updatePreferencesSchema.safeParse({
          channels: [{ channel: 'in_app' as any, enabled: true }],
        }).success,
      ).toBe(false);
    });

    it('should fail if duplicate channel entries are supplied', () => {
      const result = updatePreferencesSchema.safeParse({
        channels: [
          { channel: 'email', enabled: true },
          { channel: 'email', enabled: false },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('preferencesResponseSchema', () => {
    const validPreferencesResponse = {
      userId: VALID_UUID_1,
      email: 'test@example.com',
      channels: [
        { channel: 'in_app', enabled: true },
        { channel: 'email', enabled: false },
      ],
    };

    it('should parse a valid preferences response', () => {
      const result = preferencesResponseSchema.safeParse(validPreferencesResponse);
      expect(result.success).toBe(true);
    });

    it('should allow nullable email in response', () => {
      const result = preferencesResponseSchema.safeParse({
        ...validPreferencesResponse,
        email: null,
      });
      expect(result.success).toBe(true);
    });

    it('should fail if userId is not a valid UUID', () => {
      expect(
        preferencesResponseSchema.safeParse({
          ...validPreferencesResponse,
          userId: 'not-a-uuid',
        }).success,
      ).toBe(false);
    });
  });
});
