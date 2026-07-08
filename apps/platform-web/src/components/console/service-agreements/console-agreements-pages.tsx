import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';
import { AgreementDetail } from './agreement-detail';
import { AgreementsList } from './agreements-list';
import { NewAgreementModal } from './new-agreement-modal';
import type { AgreementScope } from './scope';

/** Resolve the workspace scope from the active `$slug` (workspaceId is '' until it loads). */
function useWorkspaceScope(): AgreementScope {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  return { kind: 'workspace', slug, workspaceId: workspace?.id ?? '' };
}

export function ConsoleAgreementsList() {
  return <AgreementsList scope={useWorkspaceScope()} />;
}

export function ConsoleAgreementsNew() {
  const scope = useWorkspaceScope();
  return (
    <>
      <AgreementsList scope={scope} />
      <NewAgreementModal scope={scope} />
    </>
  );
}

export function ConsoleAgreementDetail() {
  const scope = useWorkspaceScope();
  const { id } = useParams({ from: '/app/$slug/service-agreements/$id' });
  return <AgreementDetail scope={scope} id={id} />;
}

/** Edit an agreement reached FROM a service detail — the editor's "back" returns to the service. */
export function ServiceAgreementEditPage() {
  const { slug, id, versionId, agreementId } = useParams({
    from: '/app/$slug/services/$id/versions/$versionId/service-agreements/$agreementId',
  });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const scope: AgreementScope = {
    kind: 'service',
    slug,
    workspaceId: workspace?.id ?? '',
    serviceId: id,
    serviceVersionId: versionId,
  };
  return <AgreementDetail scope={scope} id={agreementId} />;
}
