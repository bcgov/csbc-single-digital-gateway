import { useParams } from '@tanstack/react-router';
import { AgreementDetail } from './agreement-detail';
import { AgreementsList } from './agreements-list';
import { NewAgreementModal } from './new-agreement-modal';
import type { AgreementScope } from './scope';

const ADMIN_SCOPE: AgreementScope = { kind: 'admin' };

export function AdminAgreementsList() {
  return <AgreementsList scope={ADMIN_SCOPE} />;
}

export function AdminAgreementsNew() {
  return (
    <>
      <AgreementsList scope={ADMIN_SCOPE} />
      <NewAgreementModal scope={ADMIN_SCOPE} />
    </>
  );
}

export function AdminAgreementDetail() {
  const { id } = useParams({ from: '/admin/service-agreements/$id' });
  return <AgreementDetail scope={ADMIN_SCOPE} id={id} />;
}
