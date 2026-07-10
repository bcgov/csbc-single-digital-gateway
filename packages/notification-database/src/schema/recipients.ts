import { boolean, index, pgEnum, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { citext, createdAt, updatedAt, uuidPk } from './_shared';

// Launch channels. Future values (sms, push) are added by ALTER TYPE migrations — any
// CHECK/DEFAULT referencing a NEW value must use the ::text cast pattern (a value added
// and used in the same migrate() transaction fails on a fresh database).
export const notificationChannel = pgEnum('notification_channel', ['in_app', 'email']);

// The notification profile — one row per user, created lazily. `user_id` is the shared
// platform `users.id` VALUE treated as an opaque identifier: no FK, no cross-database
// join, ever. Contact fields live here (email now; phone/locale in future waves); push
// device tokens will be a child table, not columns.
export const recipients = pgTable(
  'recipients',
  {
    id: uuidPk(),
    userId: uuid('user_id').notNull(),
    email: citext('email'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [unique('recipients_user_id_unique').on(table.userId)],
);

// Per-channel opt-in toggles. A missing row means "never configured"; enabled=false is an
// explicit opt-out. Fan-out emits a delivery only for enabled rows.
export const channelPreferences = pgTable(
  'channel_preferences',
  {
    id: uuidPk(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => recipients.id, { onDelete: 'cascade' }),
    channel: notificationChannel('channel').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('channel_preferences_recipient_channel_unique').on(table.recipientId, table.channel),
    index('channel_preferences_recipient_idx').on(table.recipientId),
  ],
);

export type Recipient = typeof recipients.$inferSelect;
export type NewRecipient = typeof recipients.$inferInsert;
export type ChannelPreference = typeof channelPreferences.$inferSelect;
export type NewChannelPreference = typeof channelPreferences.$inferInsert;
