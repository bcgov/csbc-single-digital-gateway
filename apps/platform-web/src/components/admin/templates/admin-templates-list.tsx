import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { NewTemplateModal } from '@/components/admin/templates/new-template-modal';
import {
  adminTemplatesQueryOptions,
  documentTypeLabel,
  type TemplateWithVersions,
} from '@/lib/templates';

function statusSummary(entry: TemplateWithVersions): string {
  const published = entry.versions.find((version) => version.status === 'published');
  if (published) {
    return `Published v${published.versionNumber}`;
  }
  if (entry.versions.some((version) => version.status === 'draft')) {
    return 'Draft';
  }
  return 'Archived';
}

/**
 * Admin Templates list — the catalog, and where a new template starts (doc 227). Feature 217: a template is a document, so its name is its version's GENERATED title and
 * its `type` replaces the old `kind`.
 */
export function AdminTemplatesList() {
  const { data: items = [] } = useQuery(adminTemplatesQueryOptions());
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          The template catalog. Open a template to manage its versions.
        </span>
        <Button size="sm" type="button" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          New template
        </Button>
      </div>
      <NewTemplateModal open={creating} onOpenChange={setCreating} />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No templates yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow key={entry.template.id}>
                  <TableCell>
                    <Link
                      to="/admin/templates/$id"
                      params={{ id: entry.template.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {/* The title is generated from the version content, so it can be absent. */}
                      {entry.versions.at(-1)?.title ?? 'Untitled'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge color="yellow">{documentTypeLabel(entry.template.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{statusSummary(entry)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.versions.length}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
