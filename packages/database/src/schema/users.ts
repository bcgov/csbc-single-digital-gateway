import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { citext, createdAt, timestamptz, updatedAt, uuidPk } from './_shared';

/** Global, platform-level roles (distinct from workspace-/document-scoped roles). */
export const userRole = pgEnum('user_role', ['admin', 'staff', 'citizen']);

/**
 * A person. Soft-deleted via `deleted_at` (NULL = active). `email` is the canonical,
 * case-insensitive (citext) form; it is nullable (the IdP may not supply one) and
 * non-unique by design. The raw IdP email lives on `identities.email`.
 */
export const users = pgTable(
  'users',
  {
    id: uuidPk(),
    displayName: text('display_name').notNull(),
    givenName: text('given_name').notNull(),
    familyName: text('family_name').notNull(),
    email: citext('email'),
    // Global roles (default {} = least privilege; the auth sync assigns on login).
    roles: userRole('roles').array().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    // Soft delete: NULL = active, non-NULL = deleted. Normal reads filter IS NULL.
    deletedAt: timestamptz('deleted_at'),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

/**
 * An external identity (OIDC issuer + subject) linked to a user. `(issuer, sub)` is
 * globally unique. `email` is kept verbatim from the IdP as raw text.
 */
export const identities = pgTable(
  'identities',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    issuer: text('issuer').notNull(),
    sub: text('sub').notNull(),
    displayName: text('display_name').notNull(),
    givenName: text('given_name').notNull(),
    familyName: text('family_name').notNull(),
    email: text('email'),
    createdAt: createdAt(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('identities_issuer_sub_key').on(table.issuer, table.sub),
    index('identities_user_id_idx').on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Identity = typeof identities.$inferSelect;
export type NewIdentity = typeof identities.$inferInsert;
