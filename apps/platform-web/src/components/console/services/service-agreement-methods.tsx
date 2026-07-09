import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  detachServiceAgreement,
  serviceAgreementRefsQueryOptions,
  type ServiceAgreementRef,
} from '@/lib/services';
import {
  type DefaultAgreement,
  workspaceDefaultAgreementsQueryOptions,
} from '@/lib/service-agreements';
import { AddAgreementModal } from './add-agreement-modal';

interface ServiceAgreementMethodsProps {
  slug: string;
  serviceId: string;
  versionId: string;
  workspaceId: string;
  /** True for non-draft versions — the list renders read-only (no add/remove). */
  readonly: boolean;
}

/** Service-detail "Service agreements" — the consent agreements attached to this service version.
 * Each row links to the agreement in the standalone console; "Add service agreement" attaches an
 * existing published agreement (authoring happens in the console, not inline). */
export function ServiceAgreementMethods({
  slug,
  serviceId,
  versionId,
  workspaceId,
  readonly,
}: ServiceAgreementMethodsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery(serviceAgreementRefsQueryOptions(serviceId, versionId));
  const { data: defaults = [] } = useQuery(workspaceDefaultAgreementsQueryOptions(workspaceId));
  // Workspace defaults ALSO apply to this service's citizens (feature 97). Show the ones not already
  // explicitly attached (deduped by document, matching the citizen union) so staff see the full set.
  const attachedDocIds = new Set(items.map((ref) => ref.agreementDocumentId));
  const extraDefaults = defaults.filter((def) => !attachedDocIds.has(def.agreementDocumentId));

  const detach = useMutation({
    mutationFn: (referenceId: string) => detachServiceAgreement(serviceId, versionId, referenceId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['services', 'detail', serviceId, 'agreements', versionId],
      }),
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Service agreements</span>
        {readonly ? null : (
          <Button size="xs" variant="outline" type="button" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" aria-hidden />
            Add service agreement
          </Button>
        )}
      </div>

      {detach.error ? (
        <p role="alert" className="text-sm text-destructive">
          {detach.error.message}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agreements attached to this service
          {extraDefaults.length > 0 ? ' (workspace defaults still apply — see below)' : ''}.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((ref: ServiceAgreementRef) => (
            <li
              key={ref.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Link
                  to="/app/$slug/service-agreements/$id"
                  params={{ slug, id: ref.agreementDocumentId }}
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {ref.title}
                </Link>
                <Badge color={ref.isOptional ? 'grey' : 'blue'}>
                  {ref.isOptional ? 'Optional' : 'Required'}
                </Badge>
                {ref.isGlobal ? <Badge color="grey">Global</Badge> : null}
              </span>
              {readonly ? null : (
                <Button
                  size="xs"
                  variant="ghost"
                  type="button"
                  className="shrink-0 text-destructive"
                  disabled={detach.isPending && detach.variables === ref.id}
                  onClick={() => setConfirmId(ref.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {extraDefaults.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Also applied from workspace defaults
          </span>
          <ul className="flex flex-col gap-2">
            {extraDefaults.map((def: DefaultAgreement) => (
              <li
                key={def.id}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3"
              >
                <Link
                  to="/app/$slug/service-agreements/$id"
                  params={{ slug, id: def.agreementDocumentId }}
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {def.title}
                </Link>
                <Badge color={def.isOptional ? 'grey' : 'blue'}>
                  {def.isOptional ? 'Optional' : 'Required'}
                </Badge>
                {def.isGlobal ? <Badge color="grey">Global</Badge> : null}
                <Badge color="yellow">Workspace default</Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Managed for all services in this workspace, in the Service Agreements console.
          </p>
        </div>
      ) : null}

      <AddAgreementModal
        open={addOpen}
        onOpenChange={setAddOpen}
        serviceId={serviceId}
        versionId={versionId}
        workspaceId={workspaceId}
        // Exclude both already-attached and workspace-default agreements (defaults already apply).
        excludeDocumentIds={[...attachedDocIds, ...defaults.map((def) => def.agreementDocumentId)]}
      />

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setConfirmId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this agreement from the service?</AlertDialogTitle>
            <AlertDialogDescription>
              Applicants will no longer respond to it for this service. The agreement itself is not
              deleted and stays available to attach again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirmId !== null) {
                  detach.mutate(confirmId);
                  setConfirmId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
