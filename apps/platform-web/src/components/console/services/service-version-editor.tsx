import type { DocumentContent } from '@repo/documents/content';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { DocumentDeleteButton } from '@/components/common/document-delete-button';
import { VersionDropdown } from '@/components/common/version-dropdown';
import { ConfirmDiscardDialog } from '@/components/console/confirm-discard-dialog';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { governingOf, VersionContent } from '@/components/console/version-content';
import { useDocumentReferenceSource } from '@/lib/document-references';
import {
  addServiceVersion,
  deleteService,
  discardServiceVersion,
  publishVersion,
  type ServiceDetail,
  serviceQueryOptions,
  updateDraft,
} from '@/lib/services';
import { documentContentOf, sameDocumentContent } from '@/lib/studio-content';

const SERVICE_NOUN = { full: 'service', short: 'service' } as const;

/**
 * Doc 230 / doc 281 — staff author a service version in the FILLABLE Document Studio: they add fields AND answer them,
 * the answers saved in `content.data`. The header is the agreement detail page's, and the URL rather than local state
 * decides which version is open.
 *
 * Gates on the query so the studio mounts WITH its content, never seeded empty and then replaced.
 */
export function ServiceVersionEditor({
  slug,
  id,
  versionId,
}: {
  readonly slug: string;
  readonly id: string;
  readonly versionId: string;
}) {
  const query = useQuery(serviceQueryOptions(id));
  if (!query.isSuccess) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!query.data.versions.some((version) => version.id === versionId)) {
    return (
      <p className="text-sm text-muted-foreground">
        Version not found.{' '}
        <Link
          to="/app/$slug/services/$id/details"
          params={{ slug, id }}
          className="text-foreground underline"
        >
          Back to the service details
        </Link>
      </p>
    );
  }
  // Keyed by version: each version starts with its own studio, edits and `deleted` flag — a route param change
  // alone would carry the previous version's across.
  return (
    <EditorBody key={versionId} slug={slug} id={id} detail={query.data} versionId={versionId} />
  );
}

function EditorBody({
  slug,
  id,
  detail,
  versionId,
}: {
  slug: string;
  id: string;
  detail: ServiceDetail;
  versionId: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Doc 287: the workspace's services, application methods and agreements for document reference fields.
  const references = useDocumentReferenceSource({
    workspaceId: detail.service.workspaceId,
    slug,
    documentId: id,
  });
  const { versions } = detail;
  const latest = versions.at(-1);
  const selected = versions.find((version) => version.id === versionId) ?? latest;
  const editable = selected?.status === 'draft';
  // Doc 281 rule 21: the template THIS version is pinned to governs which fields staff may add.
  const governing = governingOf(
    selected?.templateVersionId == null
      ? undefined
      : detail.definitions[selected.templateVersionId],
  );

  /** Rule 22: what the studio's content is compared with — the server's, rebuilt every render, so a save cleans. */
  const stored = documentContentOf(selected?.content);
  /**
   * The studio's seed, pinned to this mount (the body is keyed by version) — never the query data, whose refetch after
   * a save hands back an equal content with a new identity (the feature 218 trap).
   */
  const [seed] = useState(stored);
  /** The content the studio last reported: `null` until its baseline emit on mount. */
  const [live, setLive] = useState<DocumentContent | null>(null);
  /** An action waiting on the discard confirmation. Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  const dirty = editable && live !== null && !sameDocumentContent(live, stored);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  /** Doc 225 B1: a deleted service or version has nothing to save, so the guard must not ask. */
  const deleted = useRef(false);
  const isDirty = useCallback(() => !deleted.current && dirtyRef.current, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });
  /**
   * Rule 4: which version is open is the URL — every switch is a navigation, which `UnsavedChangesGuard`
   * already stops with Save / Discard while there are unsaved answers.
   */
  const openVersion = (next: string) =>
    navigate({
      to: '/app/$slug/services/$id/versions/$versionId/edit',
      params: { slug, id, versionId: next },
    });
  /**
   * New version CREATES before it navigates, so it asks before the create rather than leaving it to the
   * guard. Confirming drops the edits, so the navigation that follows is not blocked again.
   */
  const confirmed = (action: () => void) =>
    dirty
      ? setPending(() => () => {
          setLive(null);
          action();
        })
      : action();

  const save = useMutation({
    mutationFn: () => {
      if (live === null) throw new Error('This version has no document to save.');
      // Rule 23: `data` ALWAYS sent — the API keeps the stored answers when it is absent, so clearing every answer
      // would otherwise clear nothing.
      return updateDraft(id, versionId, { content: { ...live, data: live.data ?? {} } });
    },
    onSuccess: invalidate,
  });
  const saveAnswers = async () => {
    await save.mutateAsync();
  };
  const publish = useMutation({
    mutationFn: () => publishVersion(id, versionId),
    onSuccess: invalidate,
  });
  const newVersion = useMutation({
    mutationFn: () => addServiceVersion(id),
    onSuccess: async (created) => {
      await invalidate();
      await openVersion(created.id);
    },
  });

  const busy = save.isPending || publish.isPending || newVersion.isPending;
  const error = save.error ?? publish.error ?? newVersion.error;
  const { service, ...deletableRest } = detail.deletable;

  return (
    // Full height: the studio sizes itself to its container (doc 218 rule 16, as the agreement page).
    <div className="flex h-full min-h-0 flex-col gap-4">
      <UnsavedChangesGuard when={isDirty} onSave={saveAnswers} onDiscard={() => setLive(null)} />
      <ConfirmDiscardDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{detail.service.title ?? 'Untitled'}</h1>
        <div className="ml-auto flex items-center gap-2">
          {selected ? <Badge color="grey">{selected.status}</Badge> : null}
          {selected ? (
            <VersionDropdown
              versions={versions}
              selectedId={selected.id}
              onSelect={(next) => void openVersion(next)}
            />
          ) : null}
          {latest?.status !== 'draft' ? (
            <Button
              size="sm"
              type="button"
              disabled={busy}
              onClick={() => confirmed(() => newVersion.mutate())}
            >
              <Pencil className="size-4" aria-hidden />
              New version
            </Button>
          ) : null}
          {editable ? (
            <>
              <Button
                size="sm"
                type="button"
                disabled={!dirty || busy}
                // Caught here: the failure is already on screen through the alert below.
                onClick={() => void saveAnswers().catch(() => {})}
              >
                {save.isPending ? <Spinner className="size-4" /> : null} Save
              </Button>
              <Button
                size="sm"
                type="button"
                // Rule 24: clean is publishable — the API refuses answers that don't match the form, and the
                // refusal shows in the alert below.
                disabled={dirty || busy}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? <Spinner className="size-4" /> : null} Publish
              </Button>
            </>
          ) : null}
          <DocumentDeleteButton
            noun={SERVICE_NOUN}
            deletable={{ document: service, ...deletableRest }}
            versionCount={versions.length}
            selected={selected}
            deleteDocument={() => deleteService(id)}
            deleteVersion={(target) => discardServiceVersion(id, target)}
            onDeleted={() => {
              // First and synchronously: the navigation below is what the guard would block.
              deleted.current = true;
              void navigate({ to: '/app/$slug/services', params: { slug } }).then(() => {
                queryClient.removeQueries({ queryKey: ['services', 'detail', id] });
                return invalidate();
              });
            }}
            onVersionDeleted={() => {
              // Rule 7: the latest REMAINING version — the deleted one may be the one on screen.
              const remaining = versions.findLast((version) => version.id !== versionId);
              deleted.current = true;
              void invalidate();
              if (remaining) void openVersion(remaining.id);
            }}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <div
        data-slot="service-version-content"
        className="min-h-0 flex-1 rounded-xl border border-border bg-background"
      >
        {/* Doc 281 rule 21: fillable for a draft — fields added and answered on the canvas — and read-only (locked to
            Preview, which shows the answers) otherwise. The header owns Save and Publish. */}
        <VersionContent
          document={seed}
          kind="document"
          type="services.service"
          editable={editable}
          fillable
          onDocumentChange={setLive}
          governedBy={governing}
          references={references}
        />
      </div>
    </div>
  );
}
