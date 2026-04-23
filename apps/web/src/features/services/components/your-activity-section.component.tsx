import { useQuery } from "@tanstack/react-query";
import { useBcscAuth } from "../../auth/auth.context";
import { applicationsForServiceQueryOptions } from "../data/applications.query";
import { YourActivityError } from "./your-activity-error.component";
import { YourActivityList } from "./your-activity-list.component";
import { YourActivitySkeleton } from "./your-activity-skeleton.component";

interface YourActivitySectionProps {
  serviceId: string;
}

const PAGE = 1;
const LIMIT = 5;

export function YourActivitySection({ serviceId }: YourActivitySectionProps) {
  const { isAuthenticated } = useBcscAuth();

  const {
    data,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...applicationsForServiceQueryOptions({
      serviceId,
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
          <p className="text-muted-foreground">No applications yet.</p>
        ) : (
          <>
            <YourActivityList items={data.items} serviceId={serviceId} />
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
