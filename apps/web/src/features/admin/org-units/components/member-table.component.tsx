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
import type { Member } from "../data/org-unit-members.query";

interface MemberTableProps {
  members: Member[];
  onRemove: (member: Member) => void;
}

export function MemberTable({ members, onRemove }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No members yet. Invite someone to get started.
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
          <TableHead className="w-16">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.userId}>
            <TableCell className="font-medium">
              {member.name ?? "—"}
            </TableCell>
            <TableCell>{member.email ?? "—"}</TableCell>
            <TableCell>
              <Badge
                variant={member.role === "admin" ? "default" : "outline"}
                className="capitalize"
              >
                {member.role}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(member.createdAt).toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(member)}
              >
                <IconTrash className="size-4" />
                <span className="sr-only">Remove member</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
