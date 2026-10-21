import type { ServiceAgreementDetail, ServiceAgreementVersion } from '@/lib/service-agreements';
import { deleteAgreement, deleteAgreementVersion } from '@/lib/service-agreements';
import { DocumentDeleteButton } from '@/components/common/document-delete-button';

const AGREEMENT = { full: 'service agreement', short: 'agreement' } as const;

/**
 * Doc 225 rules 8-12 — deleting an agreement, or one of its versions, from either detail page. The
 * behaviour is the shared `DocumentDeleteButton` (doc 227 extracted it for templates); this binds it
 * to the agreement's endpoints and its `deletable` answer, which turns on consents and defaults.
 */
export function AgreementDeleteButton({
  id,
  detail,
  selected,
  onDeleted,
  onVersionDeleted,
}: {
  readonly id: string;
  readonly detail: ServiceAgreementDetail;
  /** The version on screen — what "Delete version <n>" means (rule 9). */
  readonly selected: ServiceAgreementVersion | undefined;
  /** The agreement is gone: the caller leaves the page. */
  readonly onDeleted: () => void;
  /** One version is gone: the caller refetches and picks another. */
  readonly onVersionDeleted: () => void;
}) {
  const { agreement, ...rest } = detail.deletable;
  return (
    <DocumentDeleteButton
      noun={AGREEMENT}
      deletable={{ document: agreement, ...rest }}
      versionCount={detail.versions.length}
      selected={selected}
      deleteDocument={() => deleteAgreement(id)}
      deleteVersion={(versionId) => deleteAgreementVersion(id, versionId)}
      onDeleted={onDeleted}
      onVersionDeleted={onVersionDeleted}
    />
  );
}
