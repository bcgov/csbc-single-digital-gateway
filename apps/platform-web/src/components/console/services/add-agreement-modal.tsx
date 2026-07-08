import { Badge } from '@repo/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FilePlus, Paperclip } from 'lucide-react';
import { useEffect, useState } from 'react';
import { agreementsQueryOptions } from '@/lib/service-agreements';
import { attachServiceAgreement, createServiceAgreement } from '@/lib/services';

interface AddAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  serviceId: string;
  versionId: string;
  workspaceId: string;
  /** Agreement document ids already attached — excluded from the picker. */
  attachedDocumentIds: string[];
}

/** "Add a service agreement" — choose to CREATE a new one (→ its editor) or ATTACH an existing
 * published one (picker). Mirrors the application-method "Add" modal. */
export function AddAgreementModal({
  open,
  onOpenChange,
  slug,
  serviceId,
  versionId,
  workspaceId,
  attachedDocumentIds,
}: AddAgreementModalProps) {
  const [mode, setMode] = useState<'choose' | 'attach'>('choose');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Always start on the chooser each time the modal opens.
  useEffect(() => {
    if (open) {
      setMode('choose');
    }
  }, [open]);

  const { data: agreements = [] } = useQuery({
    ...agreementsQueryOptions(workspaceId),
    enabled: open && mode === 'attach' && workspaceId !== '',
  });
  const attached = new Set(attachedDocumentIds);
  const selectable = agreements.filter((a) => a.status === 'published' && !attached.has(a.id));

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['services', 'detail', serviceId, 'agreements', versionId],
    });

  const create = useMutation({
    mutationFn: () => createServiceAgreement(serviceId, versionId),
    onSuccess: async (ref) => {
      await invalidate();
      onOpenChange(false);
      // Author the new draft agreement in its editor (then publish it to satisfy the service gate).
      await navigate({
        to: '/app/$slug/service-agreements/$id',
        params: { slug, id: ref.agreementDocumentId },
      });
    },
  });

  const attach = useMutation({
    mutationFn: (agreementDocumentId: string) =>
      attachServiceAgreement(serviceId, versionId, agreementDocumentId),
    onSuccess: async () => {
      await invalidate();
      onOpenChange(false);
    },
  });

  const busy = create.isPending || attach.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a service agreement</DialogTitle>
          <DialogDescription>
            {mode === 'choose'
              ? 'Create a new consent document or attach an existing published one.'
              : 'Choose a published agreement to attach.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => create.mutate()}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {create.isPending ? (
                  <Spinner className="size-[18px]" />
                ) : (
                  <FilePlus className="size-[18px]" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Create a new agreement
                </span>
                <span className="block text-sm text-muted-foreground">
                  Start a new consent document and author it.
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('attach')}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Paperclip className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Attach an existing agreement
                </span>
                <span className="block text-sm text-muted-foreground">
                  Reuse a published agreement from this workspace or a global one.
                </span>
              </span>
            </button>
            {create.error ? (
              <p role="alert" className="text-sm text-destructive">
                {create.error.message}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {attach.error ? (
              <p role="alert" className="text-sm text-destructive">
                {attach.error.message}
              </p>
            ) : null}
            {selectable.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No published agreements available to attach.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {selectable.map((agreement) => (
                  <li key={agreement.id}>
                    <button
                      type="button"
                      disabled={attach.isPending}
                      onClick={() => attach.mutate(agreement.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                    >
                      <span className="font-medium text-foreground">{agreement.title}</span>
                      {agreement.isGlobal ? <Badge variant="outline">Global</Badge> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('choose')}
              className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
