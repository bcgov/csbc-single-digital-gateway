import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ConsentGate } from "../../../../../../../features/services/components/consent-gate.component";
import { servicesQueryOptions } from "../../../../../../../features/services/data/services.query";
import type { ServiceDto } from "../../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceId/apply/$applicationId/data-and-privacy",
)({
  beforeLoad: async ({ params }) => {
    // TODO: Restore consent check once service.settings.consent is available on ServiceDto
    // const documentIds = service?.settings?.consent?.map((c) => c.documentId) ?? [];
    const documentIds: string[] = [];
    if (documentIds.length === 0) {
      throw redirect({
        to: "/app/services/$serviceId/apply/$applicationId",
        params,
      });
    }
  },
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw notFound();
    }
    // TODO: Restore documentIds from service.settings.consent once available on ServiceDto
    const documentIds: string[] = [];
    return { service, documentIds };
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
        { label: "Data & privacy" },
      ];
    },
  },
  component: DataAndPrivacyComponent,
});

function DataAndPrivacyComponent() {
  const { documentIds } = Route.useLoaderData();
  const navigate = useNavigate();
  const params = Route.useParams();

  return (
    <ConsentGate
      onAgree={() => {
        queryClient.invalidateQueries({ queryKey: ["consent-documents"] });
        navigate({
          to: "/app/services/$serviceId/apply/$applicationId",
          params,
        });
      }}
      documentIds={documentIds}
    />
  );
}
