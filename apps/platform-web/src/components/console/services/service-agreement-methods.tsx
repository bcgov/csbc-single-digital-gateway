import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
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
  /** True for non-draft versions — the attached list renders read-only. */
  readonly: boolean;
}

/** Service-detail panel — the consent agreements attached to this service version. "Add service
 * agreement" opens a modal to create a new one (→ its editor) or attach an existing published one. */
export function ServiceAgreementMethods({
  slug,
  serviceId,
  versionId,
  workspaceId,
  readonly,
}: ServiceAgreementMethodsProps) {
  const [addOpen, setAddOpen] = useState(false);
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
      <div className="flex items-center justify-between gap-3">
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
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{ref.title}</span>
                <Badge variant={ref.isOptional ? 'secondary' : 'default'}>
                  {ref.isOptional ? 'Optional' : 'Required'}
                </Badge>
                {ref.isGlobal ? <Badge variant="outline">Global</Badge> : null}
              </div>
              {readonly ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  aria-label={`Detach ${ref.title}`}
                  disabled={detach.isPending && detach.variables === ref.id}
                  onClick={() => detach.mutate(ref.id)}
                >
                  {detach.isPending && detach.variables === ref.id ? (
                    <Spinner className="size-4" />
                  ) : (
                    <X className="size-4" aria-hidden />
                  )}
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
    </div>
  );
}
