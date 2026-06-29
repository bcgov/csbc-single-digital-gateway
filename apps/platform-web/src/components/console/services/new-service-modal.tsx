import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Spinner } from '@repo/ui/spinner';
import { Textarea } from '@repo/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { createService } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/** "New service" modal over the services list (route `/services/new`). Collects only a title +
 * description; everything else (the form/version config) is done on the service detail afterwards. */
export function NewServiceModal() {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const close = () => navigate({ to: '/app/$slug/services', params: { slug } });
  const create = useMutation({
    mutationFn: () => {
      const trimmed = title.trim();
      if (trimmed === '') {
        throw new Error('A title is required');
      }
      if (workspaceId === '') {
        throw new Error('No active workspace');
      }
      return createService({
        workspaceId,
        title: trimmed,
        data: { title: trimmed, description: description.trim() },
        applications: [],
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await navigate({
        to: '/app/$slug/services/$id',
        params: { slug, id: result.service.id },
        replace: true,
      });
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          void close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service</DialogTitle>
          <DialogDescription>
            Give the service a title and description — you can configure the rest after it’s
            created.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-service-title">Title</Label>
            <Input
              id="new-service-title"
              value={title}
              autoFocus
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-service-description">Description</Label>
            <Textarea
              id="new-service-description"
              value={description}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {create.error ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => void close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || workspaceId === ''}>
              {create.isPending ? <Spinner className="size-4" /> : null}
              Create service
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
