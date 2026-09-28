import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { TemplateSelect } from '@/components/common/template-select';
import { createService } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/**
 * "New service" modal — a controlled dialog opened from the Services list "New" button and the
 * workspace Overview "Create new service" card. On success it navigates to the new service; cancel
 * or escape closes and resets.
 *
 * Feature 217: this collected a name + short description through JSONForms and posted them as the
 * service's `data`. A service is an AUTHORED document now — create takes only a title, which the
 * API stamps into the copied template's root label — so the modal is a single plain field, and it
 * lands on the service console rather than the deleted `/old/edit` editor.
 */
export function NewServiceModal({
  open,
  onOpenChange,
}: {
  /** Whether the modal is open (controlled by the parent). */
  open: boolean;
  /** Called to open/close the modal — the parent owns the boolean. */
  onOpenChange: (open: boolean) => void;
}) {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => {
      const trimmed = title.trim();
      if (trimmed === '') {
        throw new Error('A title is required');
      }
      if (workspaceId === '') {
        throw new Error('No active workspace');
      }
      if (templateId === undefined) {
        throw new Error('Choose a template');
      }
      return createService({ workspaceId, title: trimmed, templateId });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      onOpenChange(false);
      await navigate({
        to: '/app/$slug/services/$id',
        params: { slug, id: result.service.id },
        replace: true,
      });
    },
  });

  /** Close and reset the form so a re-open starts clean (the modal stays mounted between opens). */
  const close = () => {
    setTitle('');
    setTemplateId(undefined);
    create.reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <DialogContent className="min-w-lg">
        <DialogHeader>
          <DialogTitle>Create New service</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Field>
            <FieldLabel htmlFor="new-service-title">Name of the service</FieldLabel>
            <Input
              id="new-service-title"
              value={title}
              maxLength={64}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <TemplateSelect
            id="new-service-template"
            type="services.service"
            value={templateId}
            onChange={setTemplateId}
          />
          {create.error ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || workspaceId === '' || templateId === undefined}
            >
              {create.isPending ? <Spinner className="size-4" /> : null}
              Create service
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
