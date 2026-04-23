import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { IconPlayerPlay } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { EnrichedApplicationDto } from "../application.dto";
import type { ServiceApplicationDto } from "../service.dto";

interface ResumeApplicationButtonProps {
  serviceId: string;
  applicationType: ServiceApplicationDto;
  /** The user's applications for this type, sorted newest-first. Must have length >= 1. */
  applications: EnrichedApplicationDto[];
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatOlderLabel(application: EnrichedApplicationDto): string {
  const title =
    application.serviceApplicationTitle.trim().length > 0
      ? application.serviceApplicationTitle
      : "application";
  const date = dateFormatter.format(new Date(application.createdAt));
  return `Resume ${title} (${date})`;
}

export function ResumeApplicationButton({
  serviceId,
  applicationType,
  applications,
}: ResumeApplicationButtonProps) {
  const [latest, ...older] = applications;
  const primaryCopy =
    applications.length === 1
      ? "Resume application"
      : "Resume latest application";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="default" size="default">
            <IconPlayerPlay size={16} stroke={1.5} aria-hidden="true" />
            {primaryCopy}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem
          render={
            <Link
              to="/app/services/$serviceId/applications/$applicationId"
              params={{ serviceId, applicationId: latest.id }}
            />
          }
        >
          {primaryCopy}
        </DropdownMenuItem>
        {older.map((application) => (
          <DropdownMenuItem
            key={application.id}
            render={
              <Link
                to="/app/services/$serviceId/applications/$applicationId"
                params={{ serviceId, applicationId: application.id }}
              />
            }
          >
            {formatOlderLabel(application)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link
              to="/app/services/$serviceId/apply/$applicationId"
              params={{ serviceId, applicationId: applicationType.id }}
            />
          }
        >
          Start a new application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
