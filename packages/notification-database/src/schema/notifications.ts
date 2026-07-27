import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { recipients } from './recipients';

// The ingestion inbox. Append-only/immutable: no updated_at, no trigger — a correction is
// a new notification. The producer-supplied idempotency key makes retried API calls and
// queue redeliveries dedupe to a no-op (the service layer maps the unique violation).
export const notifications = pgTable(
  'notifications',
  {
    id: uuidPk(),
    idempotencyKey: text('idempotency_key').notNull(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => recipients.id, { onDelete: 'cascade' }),
    // Producer event category, e.g. 'application.decision' — template selection later.
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    // Structured extras (e.g. link target). Loosely typed on purpose — normalize at read.
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('notifications_idempotency_key_unique').on(table.idempotencyKey),
    // Pin (id, recipient_id) so deliveries can composite-FK onto it — DB-enforces that a
    // delivery's denormalized recipient matches its parent notification's recipient.
    unique('notifications_id_recipient_unique').on(table.id, table.recipientId),
    index('notifications_recipient_created_idx').on(
      table.recipientId,
      sql`${table.createdAt} DESC`,
    ),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
