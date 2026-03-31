import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { Link } from "@tanstack/react-router";
import { VersionStatusBadge } from "../../components/version-status-badge.component";
import type { ConsentDocumentVersionSummary } from "../data/consent-documents.query";

interface DocVersionsTableProps {
  docId: string;
  versions: ConsentDocumentVersionSummary[];
}

export function DocVersionsTable({
  docId,
  versions,
}: DocVersionsTableProps) {
  if (versions.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        No versions yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Published</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((v) => (
          <TableRow key={v.id} className="cursor-pointer">
            <TableCell>
              <Link
                to="/admin/consent/documents/$docId/versions/$versionId"
                params={{ docId, versionId: v.id }}
                className="font-medium text-bcgov-blue hover:underline"
              >
                v{v.version}
              </Link>
            </TableCell>
            <TableCell>
              <VersionStatusBadge status={v.status} />
            </TableCell>
            <TableCell>
              {new Date(v.createdAt).toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell>
              {v.publishedAt
                ? new Date(v.publishedAt).toLocaleDateString([], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
