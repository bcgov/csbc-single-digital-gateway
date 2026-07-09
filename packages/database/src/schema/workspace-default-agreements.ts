import { sql } from 'drizzle-orm';
import { check, foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { documents } from './documents';
import { workspaces } from './workspaces';

/**
 * A workspace admin's DEFAULT service agreements — agreements that apply to EVERY service in the
 * workspace (resolved at read time, initiative `shared-service-agreements`). A document-only pointer
 * (no version pin): the agreement resolves its current published version, consistent with Wave 1.
 * Immutable: no `updated_at` — a default is added or removed, never edited.
 *
 * Integrity mirrors `document_references` target pinning (feature 85; `documents.kind` is `text`):
 * the target must be a `service-agreement` document (composite kind FK + CHECK), and it must be
 * GLOBAL or in the owning workspace (composite workspace FK — MATCH SIMPLE skips it when the
 * agreement is global — plus a same-workspace-or-global CHECK).
 */
export const workspaceDefaultAgreements = pgTable(
  'workspace_default_agreements',
  {
    id: uuidPk(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agreementDocumentId: uuid('agreement_document_id').notNull(),
    // Denormalized `documents.kind`, pinned to 'service-agreement' by the FK + CHECK below.
    agreementKind: text('agreement_kind').notNull(),
    // The agreement's workspace, or NULL when the agreement is GLOBAL.
    agreementWorkspaceId: uuid('agreement_workspace_id'),
    createdAt: createdAt(),
  },
  (table) => [
    unique('workspace_default_agreements_ws_doc_key').on(
      table.workspaceId,
      table.agreementDocumentId,
    ),
    foreignKey({
      columns: [table.agreementDocumentId, table.agreementKind],
      foreignColumns: [documents.id, documents.kind],
      name: 'workspace_default_agreements_kind_fk',
    }).onDelete('restrict'),
    // Target side keyed on agreement_workspace_id: NULL ⇒ global (FK skipped); non-NULL ⇒ the
    // agreement must exist in that workspace.
    foreignKey({
      columns: [table.agreementDocumentId, table.agreementWorkspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'workspace_default_agreements_ws_fk',
    }).onDelete('restrict'),
    check(
      'workspace_default_agreements_kind_chk',
      sql`${table.agreementKind} = 'service-agreement'`,
    ),
    // The agreement is global (NULL) or in the owning workspace — never another workspace's.
    check(
      'workspace_default_agreements_ws_scope_chk',
      sql`${table.agreementWorkspaceId} IS NULL OR ${table.agreementWorkspaceId} = ${table.workspaceId}`,
    ),
  ],
);

export type WorkspaceDefaultAgreement = typeof workspaceDefaultAgreements.$inferSelect;
export type NewWorkspaceDefaultAgreement = typeof workspaceDefaultAgreements.$inferInsert;
