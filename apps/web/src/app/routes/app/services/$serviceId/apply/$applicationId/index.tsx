import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { StartingApplicationLoader } from "../../../../../../../features/services/components/starting-application-loader.component";
import { submitApplication } from "../../../../../../../features/services/data/applications.mutation";
import { servicesQueryOptions } from "../../../../../../../features/services/data/services.query";
import type {
  ServiceApplicationDto,
  ServiceDto,
} from "../../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceId/apply/$applicationId/",
)({
  beforeLoad: async () => {
    // TODO: Restore consent check once service.settings.consent is available on ServiceDto
    // const documentIds = service?.settings?.consent?.map((c) => c.documentId) ?? [];
    const documentIds: string[] = [];
    if (documentIds.length > 0) {
      // Redirect to data-and-privacy if there are unconsented documents
    }
  },
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw notFound();
    }
    const application = service.content?.applications?.find(
      (a: ServiceApplicationDto) => a.id === params.applicationId,
    );
    if (!application) {
      throw notFound();
    }
    return { service, application };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => {
      const data = loaderData as
        | { service: ServiceDto; application: { label: string } }
        | undefined;
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
        ...(data?.application
          ? [{ label: `Apply for ${data.application.label}` }]
          : []),
      ];
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: services = [] } = useQuery(servicesQueryOptions);
  const { service: loaderService, application: loaderApplication } =
    Route.useLoaderData() as {
      service: ServiceDto;
      application: ServiceApplicationDto;
    };
  const service =
    services.find((s) => s.id === loaderService.id) ?? loaderService;
  const application =
    service.content?.applications?.find(
      (a: ServiceApplicationDto) => a.id === loaderApplication.id,
    ) ?? loaderApplication;

  const navigate = useNavigate();
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    if (!service.versionId) {
      toast.error("We couldn't start your application.", {
        description: "This service is not currently accepting applications.",
      });
      navigate({
        to: "/app/services/$serviceId",
        params: { serviceId: service.id },
        replace: true,
      });
      return;
    }

    submitApplication({
      serviceId: service.id,
      versionId: service.versionId,
      applicationId: application.id,
    })
      .then((row) => {
        navigate({
          to: "/app/services/$serviceId/applications/$applicationId",
          params: { serviceId: service.id, applicationId: row.id },
          replace: true,
        });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Please try again.";
        toast.error("We couldn't start your application.", {
          description: message,
        });
        navigate({
          to: "/app/services/$serviceId",
          params: { serviceId: service.id },
          replace: true,
        });
      });
  }, [application.id, navigate, service.id, service.versionId]);

  return <StartingApplicationLoader />;
}
