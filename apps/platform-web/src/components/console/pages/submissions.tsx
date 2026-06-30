import { Badge } from '@repo/ui/badge';
import { Skeleton } from '@repo/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { ListPage } from '@/components/console/list-page';
import { type SubmissionStatus, submissionsQueryOptions } from '@/lib/submissions';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const STATUS_TABS: Array<{ value: string; label: string; status?: SubmissionStatus }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending', status: 'pending' },
  { value: 'in_review', label: 'In review', status: 'in_review' },
  { value: 'needs_changes', label: 'Needs changes', status: 'needs_changes' },
  { value: 'approved', label: 'Approved', status: 'approved' },
];

const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : '—');

/** All submissions in the workspace, filterable by status — the staff review queue (feature 65). */
export function SubmissionsPage() {
  const { slug } = useParams({ from: '/app/$slug/submissions' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const [tab, setTab] = useState('all');
  const status = STATUS_TABS.find((t) => t.value === tab)?.status;
  const submissions = useQuery({
    ...submissionsQueryOptions(workspace?.id ?? '', status),
    enabled: workspace != null,
  });

  const items = submissions.data ?? [];
  const toolbar = (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        {STATUS_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const table =
    submissions.isPending && workspace != null ? (
      <Skeleton className="h-40 w-full" />
    ) : items.length > 0 ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link
                  to="/app/$slug/submissions/$id"
                  params={{ slug, id: s.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {s.applicantName}
                </Link>
                <div className="text-xs text-muted-foreground">{s.reference}</div>
              </TableCell>
              <TableCell>{s.serviceTitle}</TableCell>
              <TableCell>{s.formTitle}</TableCell>
              <TableCell>
                <Badge variant="secondary">{s.statusLabel}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(s.submittedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : undefined;

  return (
    <ListPage
      toolbar={toolbar}
      emptyTitle="No submissions yet"
      emptyDescription="They appear here once applicants submit."
    >
      {table}
    </ListPage>
  );
}
