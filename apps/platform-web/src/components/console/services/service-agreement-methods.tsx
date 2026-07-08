import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import {
  createServiceAgreement,
  detachServiceAgreement,
  serviceAgreementRefsQueryOptions,
  type ServiceAgreementRef,
} from '@/lib/services';
import { AttachAgreementModal } from './attach-agreement-modal';

interface ServiceAgreementMethodsProps {
  slug: string;
  serviceId: string;
  versionId: string;
  workspaceId: string;
  /** True for non-draft versions — the attached list renders read-only. */
  readonly: boolean;
}

/** Service-detail panel — the consent agreements attached to this service version. Staff can
 * create a new agreement inline (created + attached, then authored) or attach an existing one. */
export function ServiceAgreementMethods({
  slug,
  serviceId,
  versionId,
  workspaceId,
  readonly,
}: ServiceAgreementMethodsProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: items = [] } = useQuery(serviceAgreementRefsQueryOptions(serviceId, versionId));

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['services', 'detail', serviceId, 'agreements', versionId],
    });

  const detach = useMutation({
    mutationFn: (referenceId: string) => detachServiceAgreement(serviceId, versionId, referenceId),
    onSuccess: () => invalidate(),
  });

  const create = useMutation({
    mutationFn: () => createServiceAgreement(serviceId, versionId),
    onSuccess: async (ref) => {
      await invalidate();
      // Author the new draft agreement in its editor (then publish it to satisfy the service gate).
      await navigate({
        to: '/app/$slug/service-agreements/$id',
        params: { slug, id: ref.agreementDocumentId },
      });
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Service agreements</span>
        {readonly ? null : (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              type="button"
              disabled={create.isPending}
              onClick={() => setAttachOpen(true)}
            >
              Attach existing
            </Button>
            <Button
              size="xs"
              type="button"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              Create agreement
            </Button>
          </div>
        )}
      </div>

      {(create.error ?? detach.error) ? (
        <p role="alert" className="text-sm text-destructive">
          {(create.error ?? detach.error)?.message}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agreements yet — create one or attach an existing published agreement.
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

      <AttachAgreementModal
        open={attachOpen}
        onOpenChange={setAttachOpen}
        serviceId={serviceId}
        versionId={versionId}
        workspaceId={workspaceId}
        attachedDocumentIds={items.map((ref) => ref.agreementDocumentId)}
      />
    </div>
  );
}
