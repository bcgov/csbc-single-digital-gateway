import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt, uuidPk } from './_shared';
import { users } from './users';

/** A tenant. `slug` defaults to a `nanoid()` (unguessable, pgcrypto-backed). */
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuidPk(),
    // DEFAULT nanoid() — the function is created in the bootstrap migration.
    slug: text('slug')
      .notNull()
      .default(sql`nanoid()`),
    name: text('name').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('workspaces_slug_key').on(table.slug)],
);

export const workspaceMembersRole = pgEnum('workspace_members_role', ['admin', 'member']);
export const workspaceMembersStatus = pgEnum('workspace_members_status', ['active', 'suspended']);

/** Membership of a user in a workspace. */
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: workspaceMembersRole('role').notNull(),
    status: workspaceMembersStatus('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Composite UNIQUE CONSTRAINT (not just an index) — required because it is the
    // referenced target of document_members' composite FK.
    unique('workspace_members_user_id_workspace_id_key').on(table.userId, table.workspaceId),
    index('workspace_members_workspace_id_idx').on(table.workspaceId),
  ],
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
