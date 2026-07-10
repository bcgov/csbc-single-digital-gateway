import { index, integer, jsonb, pgEnum, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, timestamptz, updatedAt, uuidPk } from './_shared';
import { users } from './users';

// Relay-owned state machine (pending → delivered | failed) — writable, not GENERATED.
export const outboxStatus = pgEnum('outbox_status', ['pending', 'delivered', 'failed']);

/**
 * Transactional outbox for notifications: producers INSERT a row in the SAME transaction as
 * the business write it announces ("notification sent iff the change committed"); the relay
 * in each BFF drains rows to the notification-service ingestion API (FOR UPDATE SKIP LOCKED
 * — concurrent relays never double-deliver). Cross-database integrity with the notification
 * DB is by VALUE (user_id, idempotency_key), never by FK.
 */
export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: uuidPk(),
    // Producer-derived from the business event (e.g. `review:<id>`); UNIQUE here AND enforced
    // again by ingestion, so a relay crash between POST and marking delivered replays safely.
    idempotencyKey: text('idempotency_key').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    // Recipient-profile email seed (usually users.email at write time); seeding never
    // enables a channel.
    email: text('email'),
    status: outboxStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextAttemptAt: timestamptz('next_attempt_at').notNull().defaultNow(),
    deliveredAt: timestamptz('delivered_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('notification_outbox_idempotency_key_unique').on(table.idempotencyKey),
    index('notification_outbox_claim_idx').on(table.status, table.nextAttemptAt),
  ],
);

export type NotificationOutbox = typeof notificationOutbox.$inferSelect;
export type NewNotificationOutbox = typeof notificationOutbox.$inferInsert;
