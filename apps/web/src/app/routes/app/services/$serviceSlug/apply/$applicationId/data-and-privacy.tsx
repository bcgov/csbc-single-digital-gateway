import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ConsentGate } from "../../../../../../../features/services/components/consent-gate.component";
import { consentDocumentsQueryOptions } from "../../../../../../../features/services/data/consent-document.query";
import { servicesQueryOptions } from "../../../../../../../features/services/data/services.query";
import type { ServiceDto } from "../../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy",
)({
  beforeLoad: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.slug === params.serviceSlug);
    const documentIds =
      service?.settings?.consent?.map((c) => c.documentId) ?? [];
    if (documentIds.length > 0) {
      const unconsented = await queryClient.ensureQueryData(
        consentDocumentsQueryOptions(documentIds),
      );
      if (unconsented.length === 0) {
        throw redirect({
          to: "/app/services/$serviceSlug/apply/$applicationId",
          params,
        });
      }
    } else {
      throw redirect({
        to: "/app/services/$serviceSlug/apply/$applicationId",
        params,
      });
    }
  },
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.slug === params.serviceSlug);
    if (!service) {
      throw notFound();
    }
    const application = service.applications?.find(
      (a) => a.id === params.applicationId,
    );
    if (!application) {
      throw notFound();
    }
    const documentIds =
      service.settings?.consent?.map((c) => c.documentId) ?? [];
    if (documentIds.length > 0) {
      await queryClient.ensureQueryData(
        consentDocumentsQueryOptions(documentIds),
      );
    }
    return { service, application, documentIds };
  },
  staticData: {
    breadcrumbs: (loaderData?: { service: ServiceDto }) => [
      { label: "Services", to: "/app/services" },
      ...(loaderData?.service
        ? [
            {
              label: loaderData.service.name,
              to: "/app/services/$serviceSlug" as const,
              params: { serviceSlug: loaderData.service.slug },
            },
          ]
        : []),
      { label: "Data & privacy" },
    ],
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
          to: "/app/services/$serviceSlug/apply/$applicationId",
          params,
        });
      }}
      documentIds={documentIds}
    />
  );
}
