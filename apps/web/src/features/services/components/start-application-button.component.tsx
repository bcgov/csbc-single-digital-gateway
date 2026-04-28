import {
  Button,
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { IconPlayerPlay } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ServiceDto } from "../service.dto";

interface StartApplicationButtonProps {
  service: ServiceDto;
  variant?: "button" | "link";
}

const CTA_COPY = "Start online application";

export function StartApplicationButton({
  service,
  variant = "button",
}: StartApplicationButtonProps) {
  const applications = service.content?.applications ?? [];

  if (applications.length === 0) {
    return null;
  }

  const isLink = variant === "link";

  if (applications.length === 1) {
    const [only] = applications;
    return (
      <span>
        <Link
          to="/app/services/$serviceId/apply/$applicationId"
          params={{ serviceId: service.id, applicationId: only.id }}
          className={
            isLink
              ? undefined
              : buttonVariants({ variant: "default", size: "default" })
          }
        >
          {!isLink && (
            <IconPlayerPlay size={16} stroke={1.5} aria-hidden="true" />
          )}
          {CTA_COPY}
        </Link>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {isLink ? (
          <span className="underline cursor-pointer">{CTA_COPY}</span>
        ) : (
          <Button variant="default" size="default">
            <IconPlayerPlay size={16} stroke={1.5} aria-hidden="true" />
            {CTA_COPY}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {applications.map((application) => (
          <DropdownMenuItem key={application.id}>
            <Link
              to="/app/services/$serviceId/apply/$applicationId"
              params={{
                serviceId: service.id,
                applicationId: application.id,
              }}
            >
              {application.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
