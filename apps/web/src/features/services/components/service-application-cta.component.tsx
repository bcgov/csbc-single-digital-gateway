import { useQuery } from "@tanstack/react-query";
import { useBcscAuth } from "../../auth/auth.context";
import type { EnrichedApplicationDto } from "../application.dto";
import { applicationsForServiceQueryOptions } from "../data/applications.query";
import type { ServiceDto } from "../service.dto";
import { ResumeApplicationButton } from "./resume-application-button.component";
import { StartApplicationTypeButton } from "./start-application-type-button.component";

interface ServiceApplicationCtaProps {
  service: ServiceDto;
}

const PAGE = 1;
const LIMIT = 5;

export function ServiceApplicationCta({ service }: ServiceApplicationCtaProps) {
  const { isAuthenticated } = useBcscAuth();

  const { data } = useQuery({
    ...applicationsForServiceQueryOptions({
      serviceId: service.id,
      page: PAGE,
      limit: LIMIT,
    }),
    enabled: isAuthenticated,
  });

  const applicationTypes = service.content?.applications ?? [];
  if (applicationTypes.length === 0) {
    return null;
  }

  const userApplications: EnrichedApplicationDto[] = data?.items ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {applicationTypes.map((applicationType) => {
        const matching = userApplications.filter(
          (application) =>
            application.serviceApplicationId === applicationType.id,
        );

        if (matching.length === 0) {
          return (
            <StartApplicationTypeButton
              key={applicationType.id}
              serviceId={service.id}
              applicationType={applicationType}
            />
          );
        }

        return (
          <ResumeApplicationButton
            key={applicationType.id}
            serviceId={service.id}
            applicationType={applicationType}
            applications={matching}
          />
        );
      })}
    </div>
  );
}
