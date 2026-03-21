import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface NavLinkItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  meta?: string;
  to?: string;
}

export function NavLinkItem({
  icon,
  title,
  description,
  meta,
  to,
}: NavLinkItemProps) {
  const content = (
    <>
      <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-blue-10">
        {icon}
      </div>

      <div className="flex flex-col justify-center min-w-0 grow">
        <span className="text-sm font-semibold truncate">{title}</span>

        {description && (
          <span className="text-sm text-muted-foreground truncate">
            {description}
          </span>
        )}

        {meta && (
          <span className="text-sm text-muted-foreground whitespace-normal">
            {meta}
          </span>
        )}
      </div>

      {to && (
        <IconChevronRight
          className="shrink-0 text-muted-foreground"
          size={20}
          stroke={1.5}
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors no-underline"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-4 px-4 py-3">{content}</div>;
}
