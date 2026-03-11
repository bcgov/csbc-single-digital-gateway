import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "../../../../../../packages/ui/src/lib/utils";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="truncate">{children}</span>
      <IconExternalLink
        size={16}
        stroke={1.5}
        className="shrink-0"
        aria-hidden="true"
      />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
