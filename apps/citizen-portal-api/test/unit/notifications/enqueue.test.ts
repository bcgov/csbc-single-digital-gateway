import { describe, expect, it, vi } from 'vitest';
import { notificationOutbox } from '@repo/database';
import { enqueueNotification } from '../../../src/notifications/enqueue';

describe('enqueueNotification unit tests', () => {
  it('Should call tx.insert with the correct row parameters and conflict options', async () => {
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoNothing: mockOnConflictDoNothing,
    });
    const mockInsert = vi.fn().mockReturnValue({
      values: mockValues,
    });
    const mockTx = {
      insert: mockInsert,
    } as any;

    const mockNotification = {
      idempotencyKey: 'key-123',
      userId: 'user-456',
      type: 'email',
      title: 'Welcome',
      body: 'Welcome to CSBC',
      payload: { referral: 'direct' },
      email: 'test@example.com',
    };

    await enqueueNotification(mockTx, mockNotification);

    expect(mockInsert).toHaveBeenCalledWith(notificationOutbox);
    expect(mockValues).toHaveBeenCalledWith(mockNotification);
    expect(mockOnConflictDoNothing).toHaveBeenCalledWith({
      target: notificationOutbox.idempotencyKey,
    });
  });
});
