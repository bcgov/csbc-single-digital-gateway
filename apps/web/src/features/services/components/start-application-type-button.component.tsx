import { buttonVariants } from "@repo/ui";
import { IconPlayerPlay } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ServiceApplicationDto } from "../service.dto";

interface StartApplicationTypeButtonProps {
  serviceId: string;
  applicationType: ServiceApplicationDto;
  variant?: "button" | "link";
}

const CTA_COPY = "Start online application";

export function StartApplicationTypeButton({
  serviceId,
  applicationType,
  variant = "button",
}: StartApplicationTypeButtonProps) {
  const isLink = variant === "link";

  return (
    <span>
      <Link
        to="/app/services/$serviceId/apply/$applicationId"
        params={{ serviceId, applicationId: applicationType.id }}
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
