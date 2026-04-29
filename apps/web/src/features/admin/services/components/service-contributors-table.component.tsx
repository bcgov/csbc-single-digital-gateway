import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { IconTrash } from "@tabler/icons-react";
import type { Contributor } from "../data/services.query";

interface ServiceContributorsTableProps {
  contributors: Contributor[];
  onRemove: (contributor: Contributor) => void;
}

export function ServiceContributorsTable({
  contributors,
  onRemove,
}: ServiceContributorsTableProps) {
  if (contributors.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        No contributors.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {contributors.map((c) => (
          <TableRow key={c.userId}>
            <TableCell className="font-medium">
              {c.name ?? "Unnamed"}
            </TableCell>
            <TableCell>{c.email ?? "—"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {c.role}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(c.createdAt).toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(c)}
              >
                <IconTrash className="size-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
