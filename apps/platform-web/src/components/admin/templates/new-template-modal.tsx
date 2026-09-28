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
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  createTemplate,
  DOCUMENT_TYPES,
  type DocumentType,
  documentTypeLabel,
} from '@/lib/templates';

/**
 * Doc 227 — "New template": a type and a title. The API creates a GLOBAL template with a DRAFT v1
 * of that type's blank content; everything else is authored on the detail page this opens.
 */
export function NewTemplateModal({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<DocumentType>(DOCUMENT_TYPES[0] ?? 'services.service');
  const [title, setTitle] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => createTemplate({ type, title: title.trim() }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      await navigate({ to: '/admin/templates/$id', params: { id: result.template.id } });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Choose what the template is for and give it a title. It starts as a draft you can author
            and publish.
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
            <Label htmlFor="new-template-type">Type</Label>
            <NativeSelect
              id="new-template-type"
              value={type}
              onChange={(event) => setType(event.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {documentTypeLabel(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-template-title">Title</Label>
            <Input
              id="new-template-title"
              value={title}
              autoFocus
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {create.error ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={title.trim() === '' || create.isPending}>
              {create.isPending ? <Spinner className="size-4" /> : null}
              Create template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
