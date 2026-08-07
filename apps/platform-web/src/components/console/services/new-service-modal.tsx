import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { createService } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/** JSONForms schema/uischema for the new-service fields (name + short description). */
const schema: JsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 64 },
    description: { type: 'string', maxLength: 96 },
  },
  required: ['title'],
};

const uischema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Label', text: 'Name & description', options: { format: 'heading', level: 6 } },
    {
      type: 'Group',
      elements: [
        { type: 'Control', scope: '#/properties/title', label: 'Name of the service' },
        { type: 'Control', scope: '#/properties/description', label: 'Short description' },
      ],
    },
  ],
} as unknown as UISchemaElement;

interface ServiceFormData {
  title?: string;
  description?: string;
}

/** "New service" modal over the services list (route `/services/new`). Collects a name + short
 * description via JSONForms; everything else (the form/version config) is done on the service detail
 * afterwards. */
export function NewServiceModal() {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const [data, setData] = useState<ServiceFormData>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const close = () => navigate({ to: '/app/$slug/services', params: { slug } });
  const create = useMutation({
    mutationFn: () => {
      const trimmed = (data.title ?? '').trim();
      if (trimmed === '') {
        throw new Error('A title is required');
      }
      if (workspaceId === '') {
        throw new Error('No active workspace');
      }
      return createService({
        workspaceId,
        title: trimmed,
        data: { title: trimmed, description: (data.description ?? '').trim() },
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
          <JsonForms
            schema={schema}
            uischema={uischema}
            data={data}
            onChange={({ data: next }) => setData(next as ServiceFormData)}
          />
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
