import { Badge } from '@repo/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agreementsQueryOptions } from '@/lib/service-agreements';
import { attachServiceAgreement } from '@/lib/services';

interface AddAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  versionId: string;
  workspaceId: string;
  /** Agreement document ids to exclude from the picker — already attached OR already a workspace
   * default (defaults are applied automatically, so attaching them again is redundant). */
  excludeDocumentIds: string[];
}

/** "Add a service agreement" — attach an EXISTING published agreement (workspace or global). Agreements
 * are authored in the standalone Service Agreements console, not inline (initiative
 * shared-service-agreements). */
export function AddAgreementModal({
  open,
  onOpenChange,
  serviceId,
  versionId,
  workspaceId,
  excludeDocumentIds,
}: AddAgreementModalProps) {
  const queryClient = useQueryClient();

  const { data: agreements = [] } = useQuery({
    ...agreementsQueryOptions(workspaceId),
    enabled: open && workspaceId !== '',
  });
  const excluded = new Set(excludeDocumentIds);
  const selectable = agreements.filter((a) => a.status === 'published' && !excluded.has(a.id));

  const attach = useMutation({
    mutationFn: (agreementDocumentId: string) =>
      attachServiceAgreement(serviceId, versionId, agreementDocumentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['services', 'detail', serviceId, 'agreements', versionId],
      });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !attach.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a service agreement</DialogTitle>
          <DialogDescription>Choose a published agreement to attach.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {attach.error ? (
            <p role="alert" className="text-sm text-destructive">
              {attach.error.message}
            </p>
          ) : null}
          {selectable.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No published agreements available to attach. Create one in the Service Agreements
              console first.
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
                    {agreement.isGlobal ? <Badge color="grey">Global</Badge> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
