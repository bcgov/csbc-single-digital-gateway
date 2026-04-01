import { Button, Separator, Spinner } from "@repo/ui";
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../api/api.client";
import { AddServiceContributorDialog } from "../../../../../features/admin/services/components/add-service-contributor-dialog.component";
import { ServiceContributorsTable } from "../../../../../features/admin/services/components/service-contributors-table.component";
import { ServiceVersionsTable } from "../../../../../features/admin/services/components/service-versions-table.component";
import { RemoveServiceContributorDialog } from "../../../../../features/admin/services/components/remove-service-contributor-dialog.component";
import {
  useCreateServiceVersion,
  useRemoveServiceContributor,
} from "../../../../../features/admin/services/data/services.mutations";
import {
  serviceContributorsQueryOptions,
  serviceQueryOptions,
} from "../../../../../features/admin/services/data/services.query";
import type { Contributor } from "../../../../../features/admin/services/data/services.query";
import { queryClient } from "../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/services/$serviceId/",
)({
  loader: async ({ params }) => {
    const svc = await queryClient.ensureQueryData(
      serviceQueryOptions(params.serviceId),
    );
    return { serviceName: svc.name };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => [
      { label: "Services", to: "/admin/services" },
      { label: (loaderData as { serviceName: string | null })?.serviceName ?? "Detail" },
    ],
  },
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const [contributorToRemove, setContributorToRemove] =
    useState<Contributor | null>(null);

  const { data: svc, isLoading, error } = useQuery(
    serviceQueryOptions(serviceId),
  );

  const { data: contributors } = useQuery(
    serviceContributorsQueryOptions(serviceId),
  );

  const { data: orgUnit } = useQuery({
    queryKey: ["org-units", svc?.orgUnitId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/org-units/${svc!.orgUnitId}`);
      return data as { id: string; name: string };
    },
    enabled: !!svc?.orgUnitId,
  });

  const { data: svcType } = useQuery({
    queryKey: ["service-types", svc?.serviceTypeId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/service-types/${svc!.serviceTypeId}`,
      );
      const enTranslation = data.publishedVersion?.translations?.find(
        (t: { locale: string }) => t.locale === "en",
      );
      return { id: data.id, name: enTranslation?.name ?? data.id } as {
        id: string;
        name: string;
      };
    },
    enabled: !!svc?.serviceTypeId,
  });

  const createVersionMutation = useCreateServiceVersion(serviceId);
  const removeMutation = useRemoveServiceContributor(serviceId);

  const handleCreateVersion = () => {
    createVersionMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Version v${result.version} created`);
        void navigate({
          to: "/admin/services/$serviceId/versions/$versionId",
          params: { serviceId, versionId: result.id },
        });
      },
      onError: (err) => {
        toast.error(`Failed to create version: ${err.message}`);
      },
    });
  };

  const handleRemoveConfirm = () => {
    if (!contributorToRemove) return;
    removeMutation.mutate(contributorToRemove.userId, {
      onSuccess: () => {
        toast.success(
          `Removed ${contributorToRemove.name ?? contributorToRemove.email ?? "contributor"}`,
        );
        setContributorToRemove(null);
      },
      onError: (err) => {
        toast.error(`Failed to remove: ${err.message}`);
      },
    });
  };

  if (isLoading) return <p className="py-8 text-center">Loading…</p>;
  if (error)
    return (
      <p className="py-8 text-center text-destructive">
        Error: {error.message}
      </p>
    );
  if (!svc) return null;

  const latestVersion = svc.versions.length
    ? svc.versions.reduce((a, b) => (b.version > a.version ? b : a))
    : null;
  const title =
    svc.publishedVersion?.name ??
    latestVersion?.name ??
    svc.name ??
    "Service";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">ID: {svc.id}</p>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Details</h2>
        <div className="flex flex-col gap-px border bg-border">
          <div className="grid grid-cols-3 gap-px">
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Org Unit
              </p>
              <p className="font-medium text-sm break-all">
                {orgUnit ? orgUnit.name : <Spinner className="mt-1" />}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Service Type
              </p>
              <p className="font-medium text-sm break-all">
                {svcType ? svcType.name : <Spinner className="mt-1" />}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Created
              </p>
              <p className="font-medium">
                {new Date(svc.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Versions</h2>
          <Button
            onClick={handleCreateVersion}
            disabled={createVersionMutation.isPending}
            variant="outline"
          >
            <IconPlus className="size-4" />
            Create Version
          </Button>
        </div>

        <ServiceVersionsTable serviceId={serviceId} versions={svc.versions} />
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Contributors</h2>
          <AddServiceContributorDialog
            serviceId={serviceId}
            trigger={
              <Button variant="outline">
                <IconUserPlus className="size-4" />
                Add Contributor
              </Button>
            }
          />
        </div>

        {contributors && (
          <ServiceContributorsTable
            contributors={contributors}
            onRemove={(c) => setContributorToRemove(c)}
          />
        )}
      </div>

      <RemoveServiceContributorDialog
        contributor={contributorToRemove}
        isPending={removeMutation.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setContributorToRemove(null)}
      />
    </div>
  );
}
