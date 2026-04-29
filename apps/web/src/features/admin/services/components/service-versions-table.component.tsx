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
import type { ServiceVersionSummary } from "../data/services.query";

interface ServiceVersionsTableProps {
  serviceId: string;
  versions: ServiceVersionSummary[];
}

export function ServiceVersionsTable({
  serviceId,
  versions,
}: ServiceVersionsTableProps) {
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
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
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
                to="/admin/services/$serviceId/versions/$versionId"
                params={{ serviceId, versionId: v.id }}
                className="font-medium text-bcgov-blue hover:underline"
              >
                {v.name ?? `v${v.version}`}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {v.description
                ? v.description.length > 50
                  ? v.description.slice(0, 50) + "…"
                  : v.description
                : "—"}
            </TableCell>
            <TableCell>v{v.version}</TableCell>
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
