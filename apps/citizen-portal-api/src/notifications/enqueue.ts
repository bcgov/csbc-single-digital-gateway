import { notificationOutbox, type Database, type NewNotificationOutbox } from '@repo/database';

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Queue a notification via the transactional outbox. MUST be called with the caller's OWN
 * transaction handle, inside the business write it announces — that same-transaction insert
 * is the entire outbox guarantee (doc 109). The relay (doc 110) delivers it asynchronously.
 */
export async function enqueueNotification(
  tx: Tx,
  row: Pick<
    NewNotificationOutbox,
    'idempotencyKey' | 'userId' | 'type' | 'title' | 'body' | 'payload' | 'email'
  >,
): Promise<void> {
  await tx.insert(notificationOutbox).values(row).onConflictDoNothing({
    target: notificationOutbox.idempotencyKey,
  });
}
