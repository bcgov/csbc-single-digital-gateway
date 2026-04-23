import { IconCake } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useBcscAuth } from "../../auth/auth.context";
import { applicationsForServiceQueryOptions } from "../data/applications.query";
import type { ServiceDto } from "../service.dto";
import { StartApplicationButton } from "./start-application-button.component";
import { YourActivityError } from "./your-activity-error.component";
import { YourActivityList } from "./your-activity-list.component";
import { YourActivitySkeleton } from "./your-activity-skeleton.component";

interface YourActivitySectionProps {
  service: ServiceDto;
}

const PAGE = 1;
const LIMIT = 5;

export function YourActivitySection({ service }: YourActivitySectionProps) {
  const { isAuthenticated } = useBcscAuth();

  const {
    data,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...applicationsForServiceQueryOptions({
      serviceId: service.id,
      page: PAGE,
      limit: LIMIT,
    }),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      id="your-activity"
      className="scroll-mt-20 flex flex-col gap-4 mb-4"
    >
      <h2 className="section-heading">Your activity</h2>
      <div className="flex flex-col gap-4 min-h-48">
        <p>Track your applications and view updates in one place.</p>
        {isPending ? (
          <YourActivitySkeleton />
        ) : isError ? (
          <YourActivityError onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <div className="flex flex-col gap-px border bg-border">
            <div className="grid gap-px">
              <div className="flex flex-col items-center bg-white p-4">
                <IconCake
                  className="shrink-0 pb-4"
                  size={48}
                  stroke={1.5}
                  color="#1e5189"
                />
                <p className="font-bold pb-2">No applications yet</p>
                <p className="pb-3">You have not applied for {service.name}.</p>
                <StartApplicationButton service={service} variant="link" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <YourActivityList items={data.items} serviceId={service.id} />
            {data.total > data.items.length && (
              <p className="text-sm text-muted-foreground">
                Showing the {data.items.length} most recent of {data.total}{" "}
                applications.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
