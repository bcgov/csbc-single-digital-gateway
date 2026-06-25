import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type ServiceSummary, servicesQueryOptions } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const STATUS_VARIANT = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
  none: 'outline',
} as const;

/** Workspace Services list — service documents with status; "New service" opens the client-first editor. */
export function ServicesList() {
  const { slug } = useParams({ from: '/app/$slug' });
  const navigate = useNavigate();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { data: items = [] } = useQuery({
    ...servicesQueryOptions(workspaceId),
    enabled: workspaceId !== '',
  });

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Service documents in this workspace.</span>
        <Button
          size="sm"
          type="button"
          disabled={workspaceId === ''}
          onClick={() => void navigate({ to: '/app/$slug/services/new', params: { slug } })}
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
    </div>
  );
}
