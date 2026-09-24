import { type SQL, sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, timestamptz, updatedAt, uuidPk } from './_shared';
import { documents } from './documents';
import { users } from './users';

export const documentVersionStatus = pgEnum('document_version_status', [
  'draft',
  'published',
  'archived',
]);
export type DocumentVersionStatus = (typeof documentVersionStatus.enumValues)[number];

export const documentVersionHistoryAction = pgEnum('document_version_history_action', [
  'created',
  'updated',
  'published',
  'archived',
]);
export type DocumentVersionHistoryAction = (typeof documentVersionHistoryAction.enumValues)[number];

// ---------------------------------------------------------------------------
// document_versions (versions of documents and templates alike)
// ---------------------------------------------------------------------------
export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuidPk(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),

    // The template version this version's content conforms to. Both null when the document has no
    // template (and for template versions). template_id mirrors documents.template_id so the
    // composite FKs below can require that template_version_id is a version of the document's own
    // template.
    templateId: uuid('template_id'),
    templateVersionId: uuid('template_version_id'),

    versionNumber: integer('version_number').notNull(),
    // Optimistic locking for draft edits: save with where revision = <loaded revision>,
    // set revision = revision + 1; zero rows updated means someone else saved first.
    revision: integer('revision').notNull().default(1),

    // The whole payload: a `@repo/forms` StudioDocument, `{ schema, uischema }`.
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),

    // Derived from content; update content to change them.
    //
    // NULLABLE on purpose: content with no `uischema.label` generates NULL. And `->>` over a JSON
    // OBJECT yields NULL too — @repo/forms types `options.description` as a Lexical object, so a
    // rich description leaves `description` NULL. Read this column as "the plain-text description
    // when there is one", which is narrower than the old `documents.description` text column.
    title: text('title').generatedAlwaysAs(
      (): SQL => sql`${documentVersions.content} -> 'uischema' ->> 'label'`,
    ),
    description: text('description').generatedAlwaysAs(
      (): SQL => sql`${documentVersions.content} -> 'uischema' -> 'options' ->> 'description'`,
    ),

    // Derived from published_at / archived_at; set those to change it. archived wins over
    // published, since published_at is kept after archiving. Per-branch enum casts so the STORED
    // generated expression is IMMUTABLE.
    status: documentVersionStatus('status')
      .notNull()
      .generatedAlwaysAs(
        (): SQL => sql`case
          when ${documentVersions.archivedAt} is not null then 'archived'::document_version_status
          when ${documentVersions.publishedAt} is not null then 'published'::document_version_status
          else 'draft'::document_version_status
        end`,
      ),
    // When this version was published. Kept after archiving, so you can tell a retired version
    // from a draft that was discarded.
    publishedAt: timestamptz('published_at'),
    // When this version was archived.
    archivedAt: timestamptz('archived_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('document_versions_document_id_version_number_key').on(
      t.documentId,
      t.versionNumber,
    ),
    // Target for document_versions_template_version_fk, submissions_document_version_fk and
    // service_agreement_consents_version_fk.
    unique('document_versions_id_document_id_key').on(t.id, t.documentId),

    // template_id must be this version's document's template.
    //
    // NO ACTION, not RESTRICT — and that matters. The sibling `document_id ON DELETE CASCADE`
    // removes these rows in the same statement; a RESTRICT here is evaluated after the cascade has
    // already emptied the table and silently finds nothing to block. NO ACTION is checked at
    // end-of-statement and is order-safe.
    //
    // KNOWN GAP (doc 217): MATCH SIMPLE skips this FK entirely when template_id IS NULL, so a
    // version of a DERIVED document can claim no template. The dangerous case — claiming a
    // template that is not its document's — is still rejected. MATCH FULL is not a fix: it errors
    // on the legitimate template-document case (document_id non-null, template_id null).
    foreignKey({
      name: 'document_versions_template_fk',
      columns: [t.documentId, t.templateId],
      foreignColumns: [documents.id, documents.templateId],
    }),

    // template_version_id must be a version of that template. A template version can't be deleted
    // while document versions conform to it — and transitively neither can the template document,
    // since its cascade to its own versions trips this FK. "Delete a template" is therefore an
    // application-level operation that must unpin first.
    foreignKey({
      name: 'document_versions_template_version_fk',
      columns: [t.templateVersionId, t.templateId],
      foreignColumns: [t.id, t.documentId],
    }),

    // Set together or not at all.
    check(
      'document_versions_template_pair_chk',
      sql`(${t.templateId} is null) = (${t.templateVersionId} is null)`,
    ),

    // "Which document versions still conform to template version X?"
    index('document_versions_template_version_id_idx').on(t.templateVersionId),

    // At most one published version per document. Also the fast path for "get the published
    // version of document X". Not deferrable — publishing is demote-then-promote in one
    // transaction.
    uniqueIndex('document_versions_one_published_key')
      .on(t.documentId)
      .where(sql`status = 'published'`),
  ],
);

// ---------------------------------------------------------------------------
// document_version_history (append-only)
// One row per action a user took on a version.
//
// revision: for 'created' / 'updated', the revision the save produced; for 'published' /
// 'archived', the revision the version was at.
//
// delta: a JSON Patch (RFC 6902) array for content changes; SQL NULL for actions that don't change
// content. The 'created' delta is the patch from {} to the initial content, so replaying a
// version's content events in revision order rebuilds its content.
// ---------------------------------------------------------------------------
export const documentVersionHistory = pgTable(
  'document_version_history',
  {
    id: uuidPk(),
    documentVersionId: uuid('document_version_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: documentVersionHistoryAction('action').notNull(),
    revision: integer('revision').notNull(),
    delta: jsonb('delta'),
    createdAt: createdAt(),
  },
  (t) => [
    // Named explicitly: drizzle's default name
    // (document_version_history_document_version_id_document_versions_id_fk) is 68 characters and
    // exceeds Postgres's 63-character identifier limit, so it would be silently truncated.
    foreignKey({
      name: 'document_version_history_version_fk',
      columns: [t.documentVersionId],
      foreignColumns: [documentVersions.id],
    }).onDelete('cascade'),

    // Content actions have a delta; publish/archive don't.
    check(
      'document_version_history_delta_chk',
      sql`(${t.action} in ('created', 'updated')) = (${t.delta} is not null)`,
    ),

    // A version starts at revision 1.
    check(
      'document_version_history_created_revision_chk',
      sql`${t.action} <> 'created' or ${t.revision} = 1`,
    ),

    // Each revision is produced by exactly one content event. Together with the check above, this
    // also means a version is created exactly once.
    uniqueIndex('document_version_history_version_revision_key')
      .on(t.documentVersionId, t.revision)
      .where(sql`${t.action} in ('created', 'updated')`),

    // "History of version X, in order."
    index('document_version_history_version_created_idx').on(t.documentVersionId, t.createdAt),
    index('document_version_history_user_id_idx').on(t.userId),
  ],
);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentVersionHistoryRow = typeof documentVersionHistory.$inferSelect;
export type NewDocumentVersionHistoryRow = typeof documentVersionHistory.$inferInsert;
