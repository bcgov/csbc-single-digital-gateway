import { Switch } from '@repo/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDefaultAgreement,
  removeDefaultAgreement,
  workspaceDefaultAgreementsQueryOptions,
} from '@/lib/service-agreements';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const DEFAULTS_KEY = (workspaceId: string) =>
  ['workspace-default-agreements', workspaceId] as const;

/**
 * Per-agreement "workspace default" toggle for the agreement detail header (feature 149). Sits to the
 * LEFT of the version picker. Self-hides unless the viewer is a workspace **admin** AND the agreement
 * is **published** — a workspace default resolves the agreement's current published version, so a
 * draft-only agreement can't be one (the citizen consent gate is published-only too). Reads/writes the
 * shared `['workspace-default-agreements', workspaceId]` query, so the Settings panel stays in sync.
 */
export function AgreementDefaultToggle({
  slug,
  workspaceId,
  agreementDocumentId,
  published,
}: {
  slug: string;
  workspaceId: string;
  /** The agreement's DOCUMENT id (defaults point at documents, not versions). */
  agreementDocumentId: string;
  /** Whether the agreement has a current published version. */
  published: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const isAdmin = workspace?.role === 'admin';
  const { data: defaults = [] } = useQuery(workspaceDefaultAgreementsQueryOptions(workspaceId));

  const current = defaults.find((d) => d.agreementDocumentId === agreementDocumentId);
  const isDefault = current !== undefined;

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await addDefaultAgreement(workspaceId, agreementDocumentId);
        return;
      }
      if (current) {
        await removeDefaultAgreement(workspaceId, current.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEFAULTS_KEY(workspaceId) }),
  });

  // Only a workspace admin can change defaults, and only a published agreement can be one.
  if (!isAdmin || !published) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <Switch
          id="agreement-workspace-default"
          aria-label="Workspace default"
          checked={isDefault}
          disabled={toggle.isPending}
          onCheckedChange={(next) => toggle.mutate(next)}
        />
        <label htmlFor="agreement-workspace-default" className="text-sm font-medium leading-none">
          Workspace default
        </label>
      </div>
      {toggle.error ? (
        <span role="alert" className="text-xs text-destructive">
          {toggle.error.message}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          Applies to every service in this workspace
        </span>
      )}
    </div>
  );
}
