import { variantOf } from '@repo/documents/content';
import { DocumentRunner } from '@repo/documents/runner';
import { DocumentView } from '@repo/documents/view';
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
import { useDocumentReferenceSource } from '@/lib/document-references';
import { answersOf } from '@/lib/service-answers';
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
 * Doc 230 / doc 281 rules 21-25 (revised 2026-10-08) — staff FILL a draft service version's DEFAULT variant in a
 * `DocumentRunner`, the answers saved in `content.data` beside the unchanged form; a published or archived version is
 * read back in a `DocumentView`. The header is the agreement detail page's, and the URL rather than local state decides
 * which version is open.
 *
 * Gates on the query so the runner mounts WITH its answers, never seeded empty and then replaced.
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
  // Keyed by version: each version starts with its own answers, edits and `deleted` flag — a route param change
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

  /** Rule 22: what the answers are compared with — the server's, rebuilt every render, so a save cleans. */
  const stored = documentContentOf(selected?.content);
  /** The runner's answers, seeded once per mount (the body is keyed by version) from the saved `content.data`. */
  const [seed] = useState(() => answersOf(selected?.content));
  const [answers, setAnswers] = useState<Record<string, unknown>>(seed);
  /** An action waiting on the discard confirmation. Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /** Rule 23: the stored form, unchanged, with the runner's answers. */
  const live = stored === null ? null : { ...stored, data: answers };
  const dirty = editable && !sameDocumentContent(live, stored);
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
          setAnswers(seed);
          action();
        })
      : action();

  const save = useMutation({
    mutationFn: () => {
      if (live === null) throw new Error('This version has no document to save.');
      // Rule 23: `data` ALWAYS sent — the API keeps the stored answers when it is absent, so clearing every answer
      // would otherwise clear nothing.
      return updateDraft(id, versionId, { content: live });
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
      <UnsavedChangesGuard when={isDirty} onSave={saveAnswers} onDiscard={() => setAnswers(seed)} />
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
        {stored === null ? (
          // The same words `VersionContent` uses (doc 218 rule 13): a row that predates the studio can hold anything.
          <p role="alert" className="p-6 text-sm text-muted-foreground">
            This version’s content isn’t a document the studio can open.
          </p>
        ) : editable ? (
          // Rules 21-21c: the DEFAULT variant filled — Back / Next and Save draft stay in the runner's bar, Submit is
          // hidden because the header publishes.
          <DocumentRunner
            schema={stored.schema}
            uischema={variantOf(stored)}
            data={answers}
            onChange={(next) => setAnswers(next as Record<string, unknown>)}
            onSaveDraft={saveAnswers}
            submit={false}
            // Rule 21c: staff jump about a Funnel freely; Publish is still checked by the API.
            freeNavigation
            references={references}
          />
        ) : (
          // Rule 21: a published or archived version reads its answers back.
          <DocumentView
            schema={stored.schema}
            uischema={variantOf(stored)}
            data={answersOf(selected?.content)}
            unanswered="show"
            references={references}
          />
        )}
      </div>
    </div>
  );
}
