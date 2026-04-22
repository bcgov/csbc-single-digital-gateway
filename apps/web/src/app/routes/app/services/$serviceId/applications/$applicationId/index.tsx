import { createFileRoute, notFound } from "@tanstack/react-router";
import { ApplicationPlaceholder } from "../../../../../../../features/services/components/application-placeholder.component";
import { servicesQueryOptions } from "../../../../../../../features/services/data/services.query";
import type { ServiceDto } from "../../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceId/applications/$applicationId/",
)({
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw notFound();
    }
    return { service };
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
  return <ApplicationPlaceholder applicationId={applicationId} />;
}
