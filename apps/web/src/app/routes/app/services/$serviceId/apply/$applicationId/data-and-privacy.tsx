import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import axios from "axios";
import { ConsentGate } from "../../../../../../../features/services/components/consent-gate.component";
import { consentDocumentsQueryOptions } from "../../../../../../../features/services/data/consent-document.query";
import { serviceQueryOptions } from "../../../../../../../features/services/data/services.query";
import type {
  ServiceApplicationDto,
  ServiceDto,
} from "../../../../../../../features/services/service.dto";
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
    let service;
    try {
      service = await queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw notFound();
      }
      throw err;
    }
    const application = service.content?.applications?.find(
      (a: ServiceApplicationDto) => a.id === params.applicationId,
    );
    if (!application) {
      throw notFound();
    }
    const documentIds =
      service.content?.consents?.map((c) => c.documentId) ?? [];
    if (documentIds.length > 0) {
      await queryClient.ensureQueryData(
        consentDocumentsQueryOptions(documentIds),
      );
    }
    return { service, application, documentIds };
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
