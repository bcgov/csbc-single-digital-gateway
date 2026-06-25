import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  archiveVersion,
  deleteDraft,
  type DocumentTypeVersion,
  publishVersion,
} from '@/lib/document-types';

/** Lifecycle actions for a single version, gated by its status. */
export function VersionActions({
  typeId,
  version,
}: {
  typeId: string;
  version: DocumentTypeVersion;
}) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['admin', 'document-types'] });

  const publish = useMutation({ mutationFn: () => publishVersion(typeId, version.id), onSuccess });
  const archive = useMutation({ mutationFn: () => archiveVersion(typeId, version.id), onSuccess });
  const remove = useMutation({ mutationFn: () => deleteDraft(typeId, version.id), onSuccess });
  const busy = publish.isPending || archive.isPending || remove.isPending;

  return (
    <div className="flex justify-end gap-1.5">
      {version.status === 'draft' ? (
        <Button size="xs" type="button" disabled={busy} onClick={() => publish.mutate()}>
          Publish
        </Button>
      ) : null}
      {version.status !== 'archived' ? (
        <Button
          size="xs"
          variant="outline"
          type="button"
          disabled={busy}
          onClick={() => archive.mutate()}
        >
          Archive
        </Button>
      ) : null}
      {version.status === 'draft' ? (
        <Button
          size="xs"
          variant="ghost"
          type="button"
          className="text-destructive"
          disabled={busy}
          onClick={() => remove.mutate()}
        >
          Delete
        </Button>
      ) : null}
    </div>
  );
}
