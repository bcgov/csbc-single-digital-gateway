import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enqueueNotification } from '../../../src/notifications/enqueue';
import { notificationOutbox } from '@repo/database';

describe('enqueueNotification', () => {
  let txMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('inserts a notification into the outbox within the transaction', async () => {
    const mockRow = {
      idempotencyKey: 'key-123',
      userId: 'user-123',
      type: 'email' as const,
      title: 'Welcome',
      body: 'Hello World',
      payload: {},
      email: 'user@example.com',
    };

    await enqueueNotification(txMock, mockRow);

    expect(txMock.insert).toHaveBeenCalledWith(notificationOutbox);
    expect(txMock.values).toHaveBeenCalledWith(mockRow);
    expect(txMock.onConflictDoNothing).toHaveBeenCalledWith({
      target: notificationOutbox.idempotencyKey,
    });
  });
});
