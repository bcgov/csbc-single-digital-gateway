import { IconHeartHandshake } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChefsFormViewer } from "../../../../../../../features/chefs";
import { InviteDelegateDialog } from "../../../../../../../features/services/components/invite-delegate-dialog.component";
import { servicesQueryOptions } from "../../../../../../../features/services/data/services.query";
import {
  isWorkflowApplication,
  type ServiceApplicationDto,
  type ServiceDto,
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

  // TODO: Restore application type check once ServiceApplicationDto is available
  // For now, render ChefsFormViewer as default
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4">
        <div className="flex items-center justify-center">
          <IconHeartHandshake className="size-6" />
        </div>

        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between">
            <h1>{application.label}</h1>
            <div>
              <InviteDelegateDialog />
            </div>
          </div>
        </div>
      </div>

      {isWorkflowApplication(application) ? (
        <></>
      ) : (
        <ChefsFormViewer
          formId={application.id}
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
              to: "/app/services/$serviceId",
              params: { serviceId: service.id },
            });
          }}
          onSubmissionError={(e) =>
            console.error("Submission error:", e.message)
          }
        />
      )}
    </div>
  );
}
