import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { agreementsQueryOptions, type ServiceAgreementSummary } from '@/lib/service-agreements';
import { type AgreementScope, scopeWorkspaceId } from './scope';

const STATUS_VARIANT = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
  none: 'outline',
} as const;

/** Shared Service Agreements list — workspace-scoped (staff) or global (admin) per `scope`. */
export function AgreementsList({ scope }: { scope: AgreementScope }) {
  const navigate = useNavigate();
  const workspaceId = scopeWorkspaceId(scope);
  // Workspace scope may still be resolving (empty id) → gate the query; global (null) is always ready.
  const ready = scope.kind === 'admin' || scope.workspaceId !== '';
  const { data: items = [] } = useQuery({ ...agreementsQueryOptions(workspaceId), enabled: ready });

  const goNew = () => {
    if (scope.kind === 'workspace') {
      void navigate({ to: '/app/$slug/service-agreements/new', params: { slug: scope.slug } });
    } else {
      void navigate({ to: '/admin/service-agreements/new' });
    }
  };

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {scope.kind === 'admin'
            ? 'Global consent documents shared across all workspaces.'
            : 'Consent documents in this workspace (plus global ones).'}
        </span>
        <Button size="sm" type="button" disabled={!ready} onClick={goNew}>
          <Plus className="size-4" aria-hidden />
          New agreement
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No service agreements yet — create one with the New button.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: ServiceAgreementSummary) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {scope.kind === 'workspace' ? (
                      <Link
                        to="/app/$slug/service-agreements/$id"
                        params={{ slug: scope.slug, id: item.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <Link
                        to="/admin/service-agreements/$id"
                        params={{ id: item.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.title}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.isGlobal ? (
                      <Badge variant="outline">Global</Badge>
                    ) : (
                      <span className="text-muted-foreground">Workspace</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
