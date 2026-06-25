import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { type ServiceSummary, createService, servicesQueryOptions } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const STATUS_VARIANT = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
  none: 'outline',
} as const;

/** Workspace Services list — service documents with status, plus a create action. */
export function ServicesList() {
  const { slug } = useParams({ from: '/app/$slug' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { data: items = [] } = useQuery({
    ...servicesQueryOptions(workspaceId),
    enabled: workspaceId !== '',
  });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Service documents in this workspace.</span>
        <Button
          size="sm"
          type="button"
          disabled={workspaceId === ''}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          New service
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No services yet — create one with the New button.
                </TableCell>
              </TableRow>
            ) : (
              items.map((service: ServiceSummary) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <Link
                      to="/app/$slug/services/$id"
                      params={{ slug, id: service.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {service.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[service.status]}>{service.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{service.versionCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {workspaceId !== '' ? (
        <CreateServiceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspaceId}
          slug={slug}
        />
      ) : null}
    </div>
  );
}

function CreateServiceDialog({
  open,
  onOpenChange,
  workspaceId,
  slug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  slug: string;
}) {
  const [title, setTitle] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => createService({ workspaceId, title: title.trim() }),
  });

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (title.trim() === '') {
      return;
    }
    const created = await mutation.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: ['services', workspaceId] });
    onOpenChange(false);
    await navigate({ to: '/app/$slug/services/$id', params: { slug, id: created.service.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service</DialogTitle>
          <DialogDescription>
            Give the service a title; you can fill in the rest next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="service-title">Title</Label>
            <Input
              id="service-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {mutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || title.trim() === ''}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
