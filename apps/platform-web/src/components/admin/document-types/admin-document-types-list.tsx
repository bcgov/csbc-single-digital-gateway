import { Badge } from '@repo/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  adminDocumentTypesQueryOptions,
  type DocumentTypeWithVersions,
} from '@/lib/document-types';

function statusSummary(entry: DocumentTypeWithVersions): string {
  const published = entry.versions.find((version) => version.status === 'published');
  if (published) {
    return `Published v${published.version}`;
  }
  if (entry.versions.some((version) => version.status === 'draft')) {
    return 'Draft';
  }
  return 'Archived';
}

/** Admin Document Types list — the (seeded) catalog. Types aren't created here; admins manage versions. */
export function AdminDocumentTypesList() {
  const { data: items = [] } = useQuery(adminDocumentTypesQueryOptions());

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-muted-foreground">
        The document type catalog. Open a type to manage its versions.
      </span>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No document types yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow key={entry.type.id}>
                  <TableCell>
                    <Link
                      to="/admin/document-types/$id"
                      params={{ id: entry.type.id }}
                      className="font-medium text-foreground hover:underline"
                    >
                      {entry.type.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge color="yellow">{entry.type.kind}</Badge>
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
