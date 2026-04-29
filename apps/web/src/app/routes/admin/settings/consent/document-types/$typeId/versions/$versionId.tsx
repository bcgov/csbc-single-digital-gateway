import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArchiveVersionDialog } from "../../../../../../../../features/admin/components/archive-version-dialog.component";
import { PublishVersionDialog } from "../../../../../../../../features/admin/components/publish-version-dialog.component";
import { VersionStatusBadge } from "../../../../../../../../features/admin/components/version-status-badge.component";
import { AddTypeTranslationDialog } from "../../../../../../../../features/admin/consent-document-types/components/add-type-translation-dialog.component";
import { TypeVersionTranslationForm } from "../../../../../../../../features/admin/consent-document-types/components/type-version-translation-form.component";
import {
  useArchiveTypeVersion,
  usePublishTypeVersion,
} from "../../../../../../../../features/admin/consent-document-types/data/consent-document-types.mutations";
import { documentTypeVersionQueryOptions } from "../../../../../../../../features/admin/consent-document-types/data/consent-document-types.query";
import { queryClient } from "../../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/settings/consent/document-types/$typeId/versions/$versionId",
)({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData(
      documentTypeVersionQueryOptions(params.typeId, params.versionId),
    );
  },
  staticData: {
    breadcrumbs: () => [
      { label: "Settings", to: "/admin/settings" },
      {
        label: "Document Types",
        to: "/admin/settings/consent/document-types",
      },
      { label: "Version" },
    ],
  },
  component: TypeVersionDetailPage,
});

function TypeVersionDetailPage() {
  const { typeId, versionId } = Route.useParams();
  const [showPublish, setShowPublish] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const { data: version, isLoading, error } = useQuery(
    documentTypeVersionQueryOptions(typeId, versionId),
  );

  const publishMutation = usePublishTypeVersion(typeId);
  const archiveMutation = useArchiveTypeVersion(typeId);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Version {version.version}</h1>
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
            <AddTypeTranslationDialog
              typeId={typeId}
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
            <TypeVersionTranslationForm
              typeId={typeId}
              versionId={versionId}
              locale={t.locale}
              translation={t}
              isDraft={isDraft}
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
