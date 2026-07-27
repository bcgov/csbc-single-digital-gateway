import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';
import { AgreementDetail } from './agreement-detail';
import { AgreementsList } from './agreements-list';
import { NewAgreementModal } from './new-agreement-modal';
import type { AgreementScope } from './scope';
import { WorkspaceDefaultAgreements } from './workspace-default-agreements';

/** Resolve the workspace scope from the active `$slug` (workspaceId is '' until it loads). */
function useWorkspaceScope(): Extract<AgreementScope, { kind: 'workspace' }> {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  return { kind: 'workspace', slug, workspaceId: workspace?.id ?? '' };
}

/** The workspace Service Agreements view: the agreements list + the workspace defaults panel. */
function WorkspaceAgreementsView({
  scope,
}: {
  scope: Extract<AgreementScope, { kind: 'workspace' }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <AgreementsList scope={scope} />
      <WorkspaceDefaultAgreements slug={scope.slug} workspaceId={scope.workspaceId} />
    </div>
  );
}

export function ConsoleAgreementsList() {
  return <WorkspaceAgreementsView scope={useWorkspaceScope()} />;
}

export function ConsoleAgreementsNew() {
  const scope = useWorkspaceScope();
  return (
    <>
      <WorkspaceAgreementsView scope={scope} />
      <NewAgreementModal scope={scope} />
    </>
  );
}

export function ConsoleAgreementDetail() {
  const scope = useWorkspaceScope();
  const { id } = useParams({ from: '/app/$slug/service-agreements/$id' });
  return <AgreementDetail scope={scope} id={id} />;
}
