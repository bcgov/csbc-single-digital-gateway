import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { Link } from "@tanstack/react-router";
import type { OrgUnit } from "../data/org-units.query";

interface ChildrenTableProps {
  orgUnits: OrgUnit[];
}

export function ChildrenTable({ orgUnits }: ChildrenTableProps) {
  if (orgUnits.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        No child org units yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orgUnits.map((child) => (
          <TableRow key={child.id} className="cursor-pointer">
            <TableCell>
              <Link
                to="/admin/settings/org-units/$orgUnitId"
                params={{ orgUnitId: child.id }}
                className="font-medium text-bcgov-blue hover:underline"
              >
                {child.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {child.type}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(child.createdAt).toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
