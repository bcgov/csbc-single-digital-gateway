import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, updatedAt, uuidPk } from './_shared';
import { users } from './users';
import { workspaceMembers, workspaces } from './workspaces';

/**
 * What a document IS. Feature 217 collapsed the old five text `kind`s: `basic-form`,
 * `multi-stage-form` and `external-application` are all `application-method` now — whether a
 * method is one form, a staged flow or an external link is a property of its `content` root
 * element (`Form` / `Flow`), not of the row.
 *
 * Adding a value: the new value can't be USED in the same transaction that adds it (Postgres
 * forbids it for `ALTER TYPE … ADD VALUE`), so backfill/usage goes in a separate migration.
 * `CREATE TYPE` in the same transaction is fine — that is how migration 0022 creates these.
 */
export const documentType = pgEnum('document_type', [
  'service',
  'application-method',
  'service-agreement',
]);
export type DocumentType = (typeof documentType.enumValues)[number];

/** Whether a document is an authored instance or the shape other documents follow. */
export const documentKind = pgEnum('document_kind', ['document', 'template']);
export type DocumentKind = (typeof documentKind.enumValues)[number];

export const documentMemberRole = pgEnum('document_member_role', [
  'owner',
  'admin',
  'editor',
  'viewer',
]);
export type DocumentMemberRole = (typeof documentMemberRole.enumValues)[number];

// ---------------------------------------------------------------------------
// documents (documents, templates, and any future kinds)
// ---------------------------------------------------------------------------
export const documents = pgTable(
  'documents',
  {
    id: uuidPk(),

    // The template this document follows. Null for templates and for documents created from
    // scratch. Which *version* of the template each document version conforms to lives on
    // document_versions.
    templateId: uuid('template_id'),

    // Null = global (available in every workspace). Set = scoped to that workspace. restrict: a
    // workspace can't be deleted while it still has documents or templates; clean them up first.
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'restrict' }),

    kind: documentKind('kind').notNull().default('document'),
    type: documentType('type').notNull(),

    // Always 'template'. Exists only so the composite FK below can require that template_id points
    // at a row where kind = 'template'. GENERATED, so it is absent from $inferInsert — never set it.
    templateKind: documentKind('template_kind')
      .notNull()
      .generatedAlwaysAs(sql`'template'::document_kind`),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Target for the self-referencing template FK.
    unique('documents_id_type_kind_key').on(t.id, t.type, t.kind),
    // Target for document_members_document_fk and submissions_document_fk.
    unique('documents_id_workspace_id_key').on(t.id, t.workspaceId),
    // Target for document_versions_template_fk.
    unique('documents_id_template_id_key').on(t.id, t.templateId),

    // template_id must reference a template of the same type.
    //
    // NO ON DELETE/UPDATE ACTION, and this is FORCED, not chosen: `template_kind` is a GENERATED
    // column, and Postgres rejects `ON DELETE SET NULL`, `ON DELETE SET DEFAULT` and
    // `ON UPDATE CASCADE` on any FK containing one ("invalid ON DELETE action for foreign key
    // constraint containing generated column"). The effect is the one we want anyway: a template
    // can't be deleted, retyped, or change kind while documents still reference it.
    foreignKey({
      name: 'documents_template_fk',
      columns: [t.templateId, t.type, t.templateKind],
      foreignColumns: [t.id, t.type, t.kind],
    }),

    // Only documents are created from templates. Loosen this if a future kind should be too.
    check(
      'documents_template_only_on_document_chk',
      sql`${t.kind} = 'document' or ${t.templateId} is null`,
    ),

    // "List templates / documents of type X" (across all workspaces)
    index('documents_kind_type_idx').on(t.kind, t.type),
    // "List templates / documents of type X in workspace W (or global)". Also covers the
    // workspace_id FK check when a workspace is deleted.
    index('documents_workspace_id_kind_type_idx').on(t.workspaceId, t.kind, t.type),
    // "Which documents follow this template?"
    index('documents_template_id_idx').on(t.templateId),
  ],
);

// ---------------------------------------------------------------------------
// document_members
// Who has access to the document today, and at what role. Revoking access = deleting the row;
// history lives in document_version_history.
//
// workspace_id ties the document and the workspace membership together: both composite FKs share
// it, so a user can only be a member of a document in a workspace they belong to. Documents with
// no workspace (global) can't have members — the FK to documents(id, workspace_id) is MATCH SIMPLE
// but this table's workspace_id is NOT NULL, so a global document has nothing to match.
// ---------------------------------------------------------------------------
export const documentMembers = pgTable(
  'document_members',
  {
    id: uuidPk(),
    addedByUserId: uuid('added_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    documentId: uuid('document_id').notNull(),
    userId: uuid('user_id').notNull(),
    workspaceId: uuid('workspace_id').notNull(),
    role: documentMemberRole('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // One membership per (document, user); also covers lookups by document.
    unique('document_members_document_id_user_id_key').on(t.documentId, t.userId),

    // The document, in this workspace. on update cascade: moving a document to another workspace
    // carries its members along, and fails unless they're all members of the new one.
    foreignKey({
      name: 'document_members_document_fk',
      columns: [t.documentId, t.workspaceId],
      foreignColumns: [documents.id, documents.workspaceId],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),

    // The user's membership in that same workspace. Leaving the workspace removes their document
    // memberships there.
    //
    // The referenced unique is `workspace_members_user_id_workspace_id_key` on
    // (user_id, workspace_id) — the OPPOSITE order to the columns listed here. That is fine:
    // Postgres matches a composite FK against the referenced unique by column SET, not by order.
    foreignKey({
      name: 'document_members_workspace_member_fk',
      columns: [t.workspaceId, t.userId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }).onDelete('cascade'),

    // At most one owner per document.
    uniqueIndex('document_members_one_owner_key')
      .on(t.documentId)
      .where(sql`${t.role} = 'owner'`),

    // "Which documents can this user access?" Also covers the workspace-member FK when someone
    // leaves a workspace.
    index('document_members_user_id_workspace_id_idx').on(t.userId, t.workspaceId),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentMember = typeof documentMembers.$inferSelect;
export type NewDocumentMember = typeof documentMembers.$inferInsert;
