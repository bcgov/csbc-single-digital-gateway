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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { createAgreement } from '@/lib/service-agreements';
import { type AgreementScope, createPayloadFor } from './scope';

/** "New agreement" modal — collects a title + description; the rest is edited on the detail page.
 * Shared by the console (workspace) + admin (global) surfaces; `scope` fixes where it's created. */
export function NewAgreementModal({ scope }: { scope: AgreementScope }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const close = () => {
    if (scope.kind === 'workspace') {
      return navigate({ to: '/app/$slug/service-agreements', params: { slug: scope.slug } });
    }
    return navigate({ to: '/admin/service-agreements' });
  };

  const create = useMutation({
    mutationFn: () => {
      const trimmed = title.trim();
      if (trimmed === '') {
        throw new Error('A title is required');
      }
      return createAgreement(
        createPayloadFor(scope, { title: trimmed, description: description.trim() }),
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['service-agreements'] });
      if (scope.kind === 'workspace') {
        await navigate({
          to: '/app/$slug/service-agreements/$id',
          params: { slug: scope.slug, id: result.agreement.id },
          replace: true,
        });
      } else {
        await navigate({
          to: '/admin/service-agreements/$id',
          params: { id: result.agreement.id },
          replace: true,
        });
      }
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
          <DialogTitle>New service agreement</DialogTitle>
          <DialogDescription>
            Give the agreement a title and description — you can write its content and options after
            it’s created.
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
            <Label htmlFor="new-agreement-title">Title</Label>
            <Input
              id="new-agreement-title"
              value={title}
              autoFocus
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-agreement-description">Description</Label>
            <Textarea
              id="new-agreement-description"
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
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Spinner className="size-4" /> : null}
              Create agreement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
