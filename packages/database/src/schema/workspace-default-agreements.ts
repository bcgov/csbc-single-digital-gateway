import { sql } from 'drizzle-orm';
import { check, foreignKey, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { documentKind, documentType, documents } from './documents';
import { workspaces } from './workspaces';

/**
 * A workspace admin's DEFAULT service agreements — agreements that apply to EVERY service in the
 * workspace (resolved at read time, initiative `shared-service-agreements`). A document-only pointer
 * (no version pin): the agreement resolves its current published version, consistent with Wave 1.
 * Immutable: no `updated_at` — a default is added or removed, never edited.
 *
 * Integrity (feature 217 re-pointed this at the new enum columns): the target must be a
 * `services.service-agreement` DOCUMENT — not a template — which the three-column composite FK enforces
 * against `documents_id_type_kind_key`, and it must be GLOBAL or in the owning workspace (composite
 * workspace FK — MATCH SIMPLE skips it when the agreement is global — plus a
 * same-workspace-or-global CHECK).
 */
export const workspaceDefaultAgreements = pgTable(
  'workspace_default_agreements',
  {
    id: uuidPk(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agreementDocumentId: uuid('agreement_document_id').notNull(),

    // Both GENERATED constants, pinning the composite FK below to a service-agreement document.
    // They replace the old text `agreement_kind` column and its CHECK: a generated constant cannot
    // drift, so a CHECK would add nothing. Absent from $inferInsert — never set them.
    agreementType: documentType('agreement_type')
      .notNull()
      .generatedAlwaysAs(sql`'services.service-agreement'::document_type`),
    agreementKind: documentKind('agreement_kind')
      .notNull()
      .generatedAlwaysAs(sql`'document'::document_kind`),

    // The agreement's workspace, or NULL when the agreement is GLOBAL.
    agreementWorkspaceId: uuid('agreement_workspace_id'),
    createdAt: createdAt(),
  },
  (table) => [
    unique('workspace_default_agreements_ws_doc_key').on(
      table.workspaceId,
      table.agreementDocumentId,
    ),
    // RESTRICT is legal here despite the generated columns — only SET NULL / SET DEFAULT /
    // ON UPDATE CASCADE are rejected on an FK containing one.
    foreignKey({
      columns: [table.agreementDocumentId, table.agreementType, table.agreementKind],
      foreignColumns: [documents.id, documents.type, documents.kind],
      name: 'workspace_default_agreements_document_fk',
    }).onDelete('restrict'),
    // Target side keyed on agreement_workspace_id: NULL ⇒ global (FK skipped); non-NULL ⇒ the
    // agreement must exist in that workspace.
    foreignKey({
      columns: [table.agreementDocumentId, table.agreementWorkspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
      name: 'workspace_default_agreements_ws_fk',
    }).onDelete('restrict'),
    // The agreement is global (NULL) or in the owning workspace — never another workspace's.
    check(
      'workspace_default_agreements_ws_scope_chk',
      sql`${table.agreementWorkspaceId} IS NULL OR ${table.agreementWorkspaceId} = ${table.workspaceId}`,
    ),
  ],
);

export type WorkspaceDefaultAgreement = typeof workspaceDefaultAgreements.$inferSelect;
export type NewWorkspaceDefaultAgreement = typeof workspaceDefaultAgreements.$inferInsert;
