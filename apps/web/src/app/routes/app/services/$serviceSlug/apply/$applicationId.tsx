import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@repo/ui";
import { IconHeartHandshake } from "@tabler/icons-react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { toast } from "sonner";
import { ChefsFormViewer } from "../../../../../../features/chefs";
import { InviteDelegateDialog } from "../../../../../../features/services/components/invite-delegate-dialog.component";
import { services } from "../../../../../../features/services/data/services.data";

export const Route = createFileRoute(
  "/app/services/$serviceSlug/apply/$applicationId"
)({
  loader: ({ params }) => {
    const service = services.find((s) => s.slug === params.serviceSlug);
    if (!service) {
      throw notFound();
    }
    const application = service.applications?.find(
      (a) => a.id === params.applicationId
    );
    if (!application) {
      throw notFound();
    }
    return { service, application };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { service, application } = Route.useLoaderData();
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4">
        <div className="flex items-center justify-center">
          <IconHeartHandshake className="size-6" />
        </div>

        <div className="flex flex-col w-full">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/app/services" />}>
                  Services
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link
                      to="/app/services/$serviceSlug"
                      params={{ serviceSlug: service.slug }}
                    />
                  }
                >
                  {service.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{application.name}</h1>
            {/* Icons */}
            <div>
              <InviteDelegateDialog />
            </div>
          </div>
        </div>
      </div>

      <ChefsFormViewer
        formId={application.id}
        apiKey={application.apiKey}
        baseUrl={application.baseUrl}
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
            }
          );
          navigate({
            to: "/app/services/$serviceSlug",
            params: { serviceSlug: service.slug },
          });
        }}
        onSubmissionError={(e) => console.error("Submission error:", e.message)}
      />
    </div>
  );
}
