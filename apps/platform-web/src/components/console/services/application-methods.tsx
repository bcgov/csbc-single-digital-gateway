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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Archive, ExternalLink, FileText, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  archiveReference,
  removeReference,
  type ServiceReference,
  updateExternalApplication,
} from '@/lib/services';
import { ExternalApplicationForm } from './external-application-form';

const KIND_LABEL: Record<string, string> = {
  'basic-form': 'Basic form',
  'multi-stage-form': 'Multi-stage form',
  'external-application': 'External link',
};

/** Service-detail "Application methods" — a list of existing method references. Each method links to
 * its builder; it can be DELETED when its form has no submissions, otherwise ARCHIVED (feature 45). */
export function ApplicationMethods({
  slug,
  serviceId,
  versionId,
  references,
  readonly,
}: {
  slug: string;
  serviceId: string;
  versionId: string;
  references: ServiceReference[];
  readonly: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editRef, setEditRef] = useState<ServiceReference | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });
  const remove = useMutation({
    mutationFn: (referenceId: string) => removeReference(serviceId, versionId, referenceId),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (referenceId: string) => archiveReference(serviceId, versionId, referenceId),
    onSuccess: invalidate,
  });
  const editExternal = useMutation({
    mutationFn: (input: { referenceId: string; label: string; url: string }) =>
      updateExternalApplication(serviceId, versionId, input.referenceId, {
        label: input.label,
        url: input.url,
      }),
    onSuccess: async () => {
      await invalidate();
      setEditRef(null);
    },
  });
  const error = remove.error ?? archive.error;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Application methods</span>
        {readonly ? null : (
          <Button
            size="xs"
            variant="outline"
            type="button"
            onClick={() =>
              navigate({
                to: '/app/$slug/services/$id/versions/$versionId/application-methods/new',
                params: { slug, id: serviceId, versionId },
              })
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Add application method
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      {references.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No application methods yet — add a form a user can apply through.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {references.map((ref) => {
            const isExternal = ref.targetKind === 'external-application';
            const Icon = isExternal
              ? ExternalLink
              : ref.targetKind === 'multi-stage-form'
                ? Layers
                : FileText;
            const archived = ref.targetStatus === 'archived';
            const busy =
              (remove.isPending && remove.variables === ref.id) ||
              (archive.isPending && archive.variables === ref.id);
            return (
              <li
                key={ref.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    {archived || isExternal ? (
                      // External methods have no builder page; forms link to their builder.
                      <span className="block truncate text-sm font-medium">{ref.targetTitle}</span>
                    ) : (
                      <Link
                        to="/app/$slug/services/$id/versions/$versionId/application-methods/$applicationMethodId"
                        params={{
                          slug,
                          id: serviceId,
                          versionId,
                          applicationMethodId: ref.targetDocumentId,
                        }}
                        className="block truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {ref.targetTitle}
                      </Link>
                    )}
                    <span className="block truncate text-xs text-muted-foreground">
                      {isExternal
                        ? (ref.url ?? KIND_LABEL[ref.targetKind])
                        : `${ref.label ? `${ref.label} · ` : ''}${KIND_LABEL[ref.targetKind] ?? ref.targetKind}`}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {archived ? <Badge color="blue">Archived</Badge> : null}
                  {readonly || archived ? null : (
                    <>
                      {isExternal ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            editExternal.reset();
                            setEditRef(ref);
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                      ) : null}
                      {ref.hasSubmissions ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          type="button"
                          disabled={busy}
                          onClick={() => archive.mutate(ref.id)}
                        >
                          <Archive className="size-3.5" aria-hidden />
                          Archive
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="ghost"
                          type="button"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => setConfirmId(ref.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
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
            <AlertDialogTitle>Delete this application method?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the application method. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirmId !== null) {
                  remove.mutate(confirmId);
                  setConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={editRef !== null}
        onOpenChange={(next) => {
          if (!next && !editExternal.isPending) {
            setEditRef(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit external link</DialogTitle>
            <DialogDescription>Update where applicants are sent to apply.</DialogDescription>
          </DialogHeader>
          {editRef ? (
            <ExternalApplicationForm
              key={editRef.id}
              initial={{ label: editRef.label ?? '', url: editRef.url ?? '' }}
              submitLabel="Save"
              submitting={editExternal.isPending}
              error={editExternal.error?.message ?? null}
              onSubmit={(values) =>
                editExternal.mutate({
                  referenceId: editRef.id,
                  label: values.label,
                  url: values.url,
                })
              }
              onCancel={() => {
                if (!editExternal.isPending) {
                  setEditRef(null);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
