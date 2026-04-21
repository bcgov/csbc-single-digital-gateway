import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { TypeVersionsTable } from "../../../../../../../features/admin/consent-document-types/components/type-versions-table.component";
import { useCreateTypeVersion } from "../../../../../../../features/admin/consent-document-types/data/consent-document-types.mutations";
import { documentTypeQueryOptions } from "../../../../../../../features/admin/consent-document-types/data/consent-document-types.query";
import { VersionStatusBadge } from "../../../../../../../features/admin/components/version-status-badge.component";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/settings/consent/document-types/$typeId/",
)({
  loader: async ({ params }) => {
    const type = await queryClient.ensureQueryData(
      documentTypeQueryOptions(params.typeId),
    );
    return { typeId: type.id };
  },
  staticData: {
    breadcrumbs: () => [
      { label: "Settings", to: "/admin/settings" },
      {
        label: "Document Types",
        to: "/admin/settings/consent/document-types",
      },
      { label: "Detail" },
    ],
  },
  component: DocumentTypeDetailPage,
});

function DocumentTypeDetailPage() {
  const { typeId } = Route.useParams();
  const navigate = useNavigate();

  const { data: type, isLoading, error } = useQuery(
    documentTypeQueryOptions(typeId),
  );
  const createVersionMutation = useCreateTypeVersion(typeId);

  const handleCreateVersion = () => {
    createVersionMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Version v${result.version} created`);
        void navigate({
          to: "/admin/settings/consent/document-types/$typeId/versions/$versionId",
          params: { typeId, versionId: result.id },
        });
      },
      onError: (err) => {
        toast.error(`Failed to create version: ${err.message}`);
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
  if (!type) return null;

  const publishedName =
    type.publishedVersion?.translations?.[0]?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>{publishedName ?? `Document Type`}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ID: {type.id}
        </p>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Details</h2>
        <div className="flex flex-col gap-px border bg-border">
          <div className="grid grid-cols-2 gap-px">
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">Status</p>
              <p className="font-medium">
                {type.publishedConsentDocumentTypeVersionId
                  ? "Published"
                  : "Unpublished"}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(type.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {type.publishedVersion && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">Published Version</h2>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                v{type.publishedVersion.version}
              </span>
              <VersionStatusBadge status={type.publishedVersion.status} />
            </div>
            {type.publishedVersion.translations.map((t) => (
              <div key={t.locale} className="rounded border p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t.locale}
                </p>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">All Versions</h2>
          <Button
            onClick={handleCreateVersion}
            disabled={createVersionMutation.isPending}
            variant="outline"
          >
            <IconPlus className="size-4" />
            Create Version
          </Button>
        </div>
        <TypeVersionsTable typeId={typeId} versions={type.versions} />
      </div>
    </div>
  );
}
