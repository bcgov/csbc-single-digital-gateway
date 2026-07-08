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
