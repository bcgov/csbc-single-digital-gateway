import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { EnrichedApplicationDto } from "../application.dto";

interface YourActivityRowProps {
  application: EnrichedApplicationDto;
  serviceId: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function YourActivityRow({
  application,
  serviceId,
}: YourActivityRowProps) {
  const title =
    application.serviceApplicationTitle.trim().length > 0
      ? application.serviceApplicationTitle
      : "Application";

  const formattedDate = dateFormatter.format(new Date(application.createdAt));

  return (
    <Link
      to="/app/services/$serviceId/applications/$applicationId"
      params={{ serviceId, applicationId: application.id }}
      className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-accent transition-colors no-underline"
    >
      <div className="flex flex-col justify-center min-w-0 grow">
        <span className="text-sm font-semibold truncate">{title}</span>
        <span className="text-sm text-muted-foreground truncate">
          {formattedDate}
        </span>
      </div>
      <IconChevronRight
        className="shrink-0 text-muted-foreground"
        size={20}
        stroke={1.5}
      />
    </Link>
  );
}
