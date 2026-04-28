import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import axios from "axios";
import { ApplicationPlaceholder } from "../../../../../../../features/services/components/application-placeholder.component";
import { applicationQueryOptions } from "../../../../../../../features/services/data/applications.query";
import { serviceQueryOptions } from "../../../../../../../features/services/data/services.query";
import type { ServiceDto } from "../../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceId/applications/$applicationId/",
)({
  loader: async ({ params }) => {
    try {
      const [service, application] = await Promise.all([
        queryClient.ensureQueryData(serviceQueryOptions(params.serviceId)),
        queryClient.ensureQueryData(
          applicationQueryOptions(params.applicationId),
        ),
      ]);
      return { service, application };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw notFound();
      }
      throw err;
    }
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => {
      const data = loaderData as { service: ServiceDto } | undefined;
      return [
        { label: "Services", to: "/app/services" },
        ...(data?.service
          ? [
              {
                label: data.service.name,
                to: "/app/services/$serviceId" as const,
                params: { serviceId: data.service.id },
              },
            ]
          : []),
        { label: "Your application" },
      ];
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { applicationId } = Route.useParams();
  const { application: loaderApplication } = Route.useLoaderData();
  const { data: application = loaderApplication } = useQuery(
    applicationQueryOptions(applicationId),
  );

  return (
    <div className="flex flex-col gap-4">
      <pre className="text-xs bg-muted p-4 rounded overflow-auto">
        {JSON.stringify(application, null, 2)}
      </pre>
      <ApplicationPlaceholder applicationId={applicationId} />
    </div>
  );
}
