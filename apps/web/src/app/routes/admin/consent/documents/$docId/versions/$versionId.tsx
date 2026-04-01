import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArchiveVersionDialog } from "../../../../../../../features/admin/components/archive-version-dialog.component";
import { PublishVersionDialog } from "../../../../../../../features/admin/components/publish-version-dialog.component";
import { VersionStatusBadge } from "../../../../../../../features/admin/components/version-status-badge.component";
import { documentTypeVersionQueryOptions } from "../../../../../../../features/admin/consent-document-types/data/consent-document-types.query";
import { AddDocTranslationDialog } from "../../../../../../../features/admin/consent-documents/components/add-doc-translation-dialog.component";
import { DocTranslationForm } from "../../../../../../../features/admin/consent-documents/components/doc-translation-form.component";
import {
  useArchiveDocVersion,
  usePublishDocVersion,
} from "../../../../../../../features/admin/consent-documents/data/consent-documents.mutations";
import {
  consentDocumentQueryOptions,
  consentDocumentVersionQueryOptions,
} from "../../../../../../../features/admin/consent-documents/data/consent-documents.query";
import { queryClient } from "../../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/consent/documents/$docId/versions/$versionId",
)({
  loader: async ({ params }) => {
    const [version, doc] = await Promise.all([
      queryClient.ensureQueryData(
        consentDocumentVersionQueryOptions(params.docId, params.versionId),
      ),
      queryClient.ensureQueryData(
        consentDocumentQueryOptions(params.docId),
      ),
    ]);
    return {
      docId: params.docId,
      docName: doc.name,
      versionNumber: version.version,
    };
  },
  staticData: {
    breadcrumbs: (loaderData: {
      docId: string;
      docName: string | null;
      versionNumber: number;
    }) => [
      { label: "Consent Documents", to: "/admin/consent/documents" },
      {
        label: loaderData?.docName ?? "Detail",
        to: `/admin/consent/documents/${loaderData.docId}`,
      },
      { label: `Version ${loaderData.versionNumber}` },
    ],
  },
  component: DocVersionDetailPage,
});

function DocVersionDetailPage() {
  const { docId, versionId } = Route.useParams();
  const [showPublish, setShowPublish] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const { data: version, isLoading, error } = useQuery(
    consentDocumentVersionQueryOptions(docId, versionId),
  );

  const { data: doc } = useQuery({
    ...consentDocumentQueryOptions(docId),
    enabled: !!version,
  });

  const typeVersionId = version?.consentDocumentTypeVersionId;
  const typeId = doc?.consentDocumentTypeId;

  const { data: typeVersion } = useQuery({
    ...documentTypeVersionQueryOptions(typeId!, typeVersionId!),
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
      contentUiSchema: enTranslation.uiSchema as UISchemaElement | undefined,
    };
  }, [typeVersion]);

  const publishMutation = usePublishDocVersion(docId);
  const archiveMutation = useArchiveDocVersion(docId);

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
            <AddDocTranslationDialog
              docId={docId}
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
            <DocTranslationForm
              docId={docId}
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
