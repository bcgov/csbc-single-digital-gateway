import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, timestamptz, updatedAt, uuidPk } from './_shared';
import { notifications } from './notifications';
import { notificationChannel, recipients } from './recipients';

// Worker-driven state machine (pending → sent | failed, retry failed → pending) — actor
// state, not timestamp-derivable, so a WRITABLE enum, not a GENERATED column. Transitions
// are app-enforced.
export const deliveryStatus = pgEnum('delivery_status', ['pending', 'sent', 'failed']);

// The per-channel outbox: one row per notification × enabled channel, written in the
// fan-out transaction. An in-app row IS the notification-center item (inserted as 'sent',
// read_at = mark-read); an email row is drained by the delivery worker with retries.
export const deliveries = pgTable(
  'deliveries',
  {
    id: uuidPk(),
    notificationId: uuid('notification_id').notNull(),
    // Denormalized from notifications for feed/unread reads without a join; pinned by the
    // composite FK below.
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => recipients.id, { onDelete: 'cascade' }),
    channel: notificationChannel('channel').notNull(),
    status: deliveryStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    // Retry schedule for the email worker: claimable when <= now(); failures push it into
    // the future (exponential backoff, app-owned policy). Meaningless once sent/failed.
    nextAttemptAt: timestamptz('next_attempt_at').notNull().defaultNow(),
    sentAt: timestamptz('sent_at'),
    // In-app mark-read; email rows never set it.
    readAt: timestamptz('read_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('deliveries_notification_channel_unique').on(table.notificationId, table.channel),
    foreignKey({
      name: 'deliveries_notification_recipient_fk',
      columns: [table.notificationId, table.recipientId],
      foreignColumns: [notifications.id, notifications.recipientId],
    }).onDelete('cascade'),
    index('deliveries_claim_idx').on(table.channel, table.status, table.nextAttemptAt),
    index('deliveries_recipient_channel_read_idx').on(
      table.recipientId,
      table.channel,
      table.readAt,
    ),
  ],
);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
