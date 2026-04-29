import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArchiveVersionDialog } from "../../../../../../features/admin/components/archive-version-dialog.component";
import { PublishVersionDialog } from "../../../../../../features/admin/components/publish-version-dialog.component";
import { VersionStatusBadge } from "../../../../../../features/admin/components/version-status-badge.component";
import { serviceTypeVersionQueryOptions } from "../../../../../../features/admin/service-types/data/service-types.query";
import { AddServiceTranslationDialog } from "../../../../../../features/admin/services/components/add-service-translation-dialog.component";
import { ServiceTranslationForm } from "../../../../../../features/admin/services/components/service-translation-form.component";
import {
  useArchiveServiceVersion,
  usePublishServiceVersion,
} from "../../../../../../features/admin/services/data/services.mutations";
import {
  serviceQueryOptions,
  serviceVersionQueryOptions,
} from "../../../../../../features/admin/services/data/services.query";
import { queryClient } from "../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/services/$serviceId/versions/$versionId",
)({
  loader: async ({ params }) => {
    const [version, svc] = await Promise.all([
      queryClient.ensureQueryData(
        serviceVersionQueryOptions(params.serviceId, params.versionId),
      ),
      queryClient.ensureQueryData(
        serviceQueryOptions(params.serviceId),
      ),
    ]);
    return {
      serviceId: params.serviceId,
      serviceName: svc.name,
      versionNumber: version.version,
    };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => {
      const data = loaderData as { serviceId: string; serviceName: string | null; versionNumber: number };
      return [
        { label: "Services", to: "/admin/services" },
        {
          label: data?.serviceName ?? "Detail",
          to: `/admin/services/${data.serviceId}`,
        },
        { label: `Version ${data.versionNumber}` },
      ];
    },
  },
  component: ServiceVersionDetailPage,
});

function ServiceVersionDetailPage() {
  const { serviceId, versionId } = Route.useParams();
  const [showPublish, setShowPublish] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const { data: version, isLoading, error } = useQuery(
    serviceVersionQueryOptions(serviceId, versionId),
  );

  const { data: svc } = useQuery({
    ...serviceQueryOptions(serviceId),
    enabled: !!version,
  });

  const typeVersionId = version?.serviceTypeVersionId;
  const typeId = svc?.serviceTypeId;

  const { data: typeVersion } = useQuery({
    ...serviceTypeVersionQueryOptions(typeId!, typeVersionId!),
    enabled: !!typeId && !!typeVersionId,
  });

  const { contentSchema, contentUiSchema } = useMemo(() => {
    if (!typeVersion?.translations) {
      return { contentSchema: undefined, contentUiSchema: undefined };
    }
    const enTranslation =
      typeVersion.translations.find((t) => t.locale === "en") ??
      typeVersion.translations[0];
    if (!enTranslation) {
      return { contentSchema: undefined, contentUiSchema: undefined };
    }
    return {
      contentSchema: enTranslation.schema as JsonSchema | undefined,
      contentUiSchema: enTranslation.uiSchema as unknown as UISchemaElement | undefined,
    };
  }, [typeVersion]);

  const publishMutation = usePublishServiceVersion(serviceId);
  const archiveMutation = useArchiveServiceVersion(serviceId);

  const handlePublish = () => {
    publishMutation.mutate(versionId, {
      onSuccess: () => {
        toast.success("Version published");
        setShowPublish(false);
      },
      onError: (err) => toast.error(`Publish failed: ${err.message}`),
    });
  };

  const handleArchive = () => {
    archiveMutation.mutate(versionId, {
      onSuccess: () => {
        toast.success("Version archived");
        setShowArchive(false);
      },
      onError: (err) => toast.error(`Archive failed: ${err.message}`),
    });
  };

  if (isLoading) return <p className="py-8 text-center">Loading…</p>;
  if (error)
    return (
      <p className="py-8 text-center text-destructive">
        Error: {error.message}
      </p>
    );
  if (!version) return null;

  const isDraft = version.status === "draft";
  const isPublished = version.status === "published";

  const translationName = version.translations.find(
    (t) => t.locale === "en",
  )?.name ?? version.translations[0]?.name;
  const title = translationName
    ? `${translationName} - Version ${version.version}`
    : `Version ${version.version}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>{title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <VersionStatusBadge status={version.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button
              onClick={() => setShowPublish(true)}
              className="bg-bcgov-blue hover:bg-bcgov-blue/80"
            >
              Publish
            </Button>
          )}
          {isPublished && (
            <Button
              onClick={() => setShowArchive(true)}
              variant="destructive"
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Translations</h2>
          {isDraft && (
            <AddServiceTranslationDialog
              serviceId={serviceId}
              versionId={versionId}
              existingLocales={version.translations.map((t) => t.locale)}
              trigger={
                <Button variant="outline">
                  <IconPlus className="size-4" />
                  Add Translation
                </Button>
              }
            />
          )}
        </div>

        {version.translations.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">
            No translations yet. Add one to get started.
          </p>
        )}

        {version.translations.map((t) => (
          <div key={t.locale} className="rounded border p-4">
            <h3 className="mb-4 font-bold">{t.locale}</h3>
            <ServiceTranslationForm
              serviceId={serviceId}
              versionId={versionId}
              locale={t.locale}
              translation={t}
              isDraft={isDraft}
              contentSchema={contentSchema}
              contentUiSchema={contentUiSchema}
            />
          </div>
        ))}
      </div>

      <PublishVersionDialog
        open={showPublish}
        isPending={publishMutation.isPending}
        onConfirm={handlePublish}
        onCancel={() => setShowPublish(false)}
      />

      <ArchiveVersionDialog
        open={showArchive}
        isPending={archiveMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setShowArchive(false)}
      />
    </div>
  );
}
