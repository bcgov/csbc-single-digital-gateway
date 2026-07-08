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
 * Each row links to the agreement's editor; "Add service agreement" creates or attaches one. */
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
          No agreements yet — add one with the button above.
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
                  to="/app/$slug/services/$id/versions/$versionId/service-agreements/$agreementId"
                  params={{ slug, id: serviceId, versionId, agreementId: ref.agreementDocumentId }}
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

      <AddAgreementModal
        open={addOpen}
        onOpenChange={setAddOpen}
        slug={slug}
        serviceId={serviceId}
        versionId={versionId}
        workspaceId={workspaceId}
        attachedDocumentIds={items.map((ref) => ref.agreementDocumentId)}
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
