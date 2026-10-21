import { index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { documentType, documents } from './documents';
import { documentVersions } from './document-versions';

/**
 * Doc 290: which version of which document references which other document — a DERIVED index of the document-reference
 * answers in `document_versions.content.data` (doc 287). platform-api's `rebuildLinksTx` is its only writer, inside
 * the transaction that writes the content; rows go by FK cascade with either end. Never authoritative: the content is.
 */
export const documentLinks = pgTable(
  'document_links',
  {
    id: uuidPk(),
    sourceDocumentId: uuid('source_document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    sourceVersionId: uuid('source_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'cascade' }),
    targetDocumentId: uuid('target_document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    /** `'references'` — the only relation today. */
    relation: text('relation').notNull(),
    /** The schema property holding the reference. */
    fieldKey: text('field_key').notNull(),
    /** The reference field's `documentType`. */
    targetType: documentType('target_type').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('document_links_version_field_target_key').on(
      table.sourceVersionId,
      table.fieldKey,
      table.targetDocumentId,
    ),
    index('document_links_target_idx').on(table.targetDocumentId),
    index('document_links_source_document_idx').on(table.sourceDocumentId),
  ],
);

export type DocumentLink = typeof documentLinks.$inferSelect;
export type NewDocumentLink = typeof documentLinks.$inferInsert;
