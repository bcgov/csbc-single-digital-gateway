import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

// Case-insensitive text (Postgres citext extension, created in 0000_bootstrap).
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const uuidPk = () => uuid('id').primaryKey().defaultRandom();

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

// Maintained by the set_updated_at() BEFORE UPDATE trigger (0002_triggers).
export const updatedAt = () => timestamptz('updated_at').notNull().defaultNow();
