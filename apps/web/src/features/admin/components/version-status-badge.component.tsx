import { Badge } from "@repo/ui";

interface VersionStatusBadgeProps {
  status: "draft" | "published" | "archived";
}

const variants: Record<
  VersionStatusBadgeProps["status"],
  "outline" | "default" | "secondary"
> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

export function VersionStatusBadge({ status }: VersionStatusBadgeProps) {
  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}
