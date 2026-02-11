import { IconHeartHandshake } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";
import { ChefsFormViewer } from "../../../../../../features/chefs";
import { ConsentGate } from "../../../../../../features/services/components/consent-dialog.component";
import { InviteDelegateDialog } from "../../../../../../features/services/components/invite-delegate-dialog.component";
import { consentDocumentsQueryOptions } from "../../../../../../features/services/data/consent-document.query";
import { servicesQueryOptions } from "../../../../../../features/services/data/services.query";
import type { ServiceDto } from "../../../../../../features/services/service.dto";
import { queryClient } from "../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/services/$serviceSlug/apply/$applicationId",
)({
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
    breadcrumbs: (loaderData?: {
      service: ServiceDto;
      application: { label: string };
    }) => [
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
      ...(loaderData?.application
        ? [{ label: `Apply for ${loaderData.application.label}` }]
        : []),
    ],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);
  const {
    service: loaderService,
    application: loaderApplication,
    documentIds,
  } = Route.useLoaderData();
  const service =
    services.find((s) => s.slug === loaderService.slug) ?? loaderService;
  const application =
    service.applications?.find((a) => a.id === loaderApplication.id) ??
    loaderApplication;
  const auth = useAuth();
  const navigate = useNavigate();
  const [consented, setConsented] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4">
        <div className="flex items-center justify-center">
          <IconHeartHandshake className="size-6" />
        </div>

        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{application.label}</h1>
            {/* Icons */}
            <div>
              <InviteDelegateDialog />
            </div>
          </div>
        </div>
      </div>

      <ConsentGate
        open={!consented}
        onAgree={() => setConsented(true)}
        onDisagree={() =>
          navigate({
            to: "/app/services/$serviceSlug",
            params: { serviceSlug: service.slug },
          })
        }
        documentIds={documentIds}
      />

      {consented && (
        <ChefsFormViewer
          formId={application.formId}
          apiKey={application.apiKey}
          baseUrl={application.url}
          headers={
            auth.user?.access_token
              ? { Authorization: `Bearer ${auth.user.access_token}` }
              : undefined
          }
          language="en"
          isolateStyles={false}
          onSubmissionComplete={() => {
            toast.success(
              `Your application for ${service.name} has been submitted successfully.`,
              {
                description:
                  "You will receive updates as your application progresses.",
              },
            );
            navigate({
              to: "/app/services/$serviceSlug",
              params: { serviceSlug: service.slug },
            });
          }}
          onSubmissionError={(e) => console.error("Submission error:", e.message)}
        />
      )}
    </div>
  );
}
