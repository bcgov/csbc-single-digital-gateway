import { foreignKey, index, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';

import { createdAt, uuidPk } from './_shared';
import { documentVersions } from './documents';
import { users } from './users';

export const serviceAgreementConsentsDecision = pgEnum('service_agreement_consents_decision', [
  'approve',
  'reject',
]);

/**
 * Append-only audit of a citizen's approve/reject decision on a specific PUBLISHED agreement
 * version. Immutable: no `updated_at`, rows are never edited or deleted — a change of mind is a
 * NEW row, and the latest row per `(user_id, agreement_version_id)` is the effective consent.
 * Keyed on the VERSION, so a newly-published agreement version has no matching row → consent
 * auto-resets per version. `user_id → users` (RESTRICT) is the durable, soft-deletable identity
 * so consent survives a user's removal; the composite FK pins the consent to a version of the
 * cited agreement document. "The version is a published service-agreement" is app-enforced at
 * write time (feature 89), not by FK (same lesson as `reviews`). See `.mdd/docs/88`.
 */
export const serviceAgreementConsents = pgTable(
  'service_agreement_consents',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    agreementDocumentId: uuid('agreement_document_id').notNull(),
    agreementVersionId: uuid('agreement_version_id').notNull(),
    decision: serviceAgreementConsentsDecision('decision').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    // The consented version provably belongs to the cited agreement document. RESTRICT: a version
    // with recorded consents can't be deleted (protects the audit) — only never-published draft
    // agreements are ever deleted, and those have no consents.
    foreignKey({
      columns: [table.agreementVersionId, table.agreementDocumentId],
      foreignColumns: [documentVersions.id, documentVersions.documentId],
      name: 'service_agreement_consents_version_fk',
    }).onDelete('restrict'),
    // Effective-consent lookup: latest decision per (user, version).
    index('service_agreement_consents_user_version_created_idx').on(
      table.userId,
      table.agreementVersionId,
      table.createdAt,
    ),
    index('service_agreement_consents_agreement_document_id_idx').on(table.agreementDocumentId),
  ],
);

export type ServiceAgreementConsent = typeof serviceAgreementConsents.$inferSelect;
export type NewServiceAgreementConsent = typeof serviceAgreementConsents.$inferInsert;
