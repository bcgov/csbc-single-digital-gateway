import { variantOf } from '@repo/documents/content';
import { DocumentRunner } from '@repo/documents/runner';
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
import { answersOf, sameAnswers } from '@/lib/service-answers';
import {
  addServiceVersion,
  deleteService,
  discardServiceVersion,
  publishVersion,
  type ServiceDetail,
  serviceQueryOptions,
  updateDraft,
} from '@/lib/services';
import { documentContentOf } from '@/lib/studio-content';

const SERVICE_NOUN = { full: 'service', short: 'service' } as const;
const noop = () => {};

/**
 * Doc 230 — staff author a service version by FILLING its form: the version's own schema and DEFAULT variant in a
 * `DocumentRunner` (doc 276), with the answers saved in `content.data`. The header is the agreement detail page's, and the
 * URL rather than local state decides which version is open.
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
  // Keyed by version: each version starts with its own answers, validity and `deleted` flag — a route
  // param change alone would carry the previous version's across.
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
  const { versions } = detail;
  const latest = versions.at(-1);
  const selected = versions.find((version) => version.id === versionId) ?? latest;
  const document = documentContentOf(selected?.content);
  const editable = selected?.status === 'draft';

  /** Rule 5: what the answers are compared with — the server's, rebuilt every render, so a save cleans. */
  const stored = answersOf(selected?.content);
  const [answers, setAnswers] = useState<Record<string, unknown>>(stored);
  /** Reported by the runner (the errors it validates with); a draft reports on mount. */
  const [valid, setValid] = useState(false);
  /** An action waiting on the discard confirmation. Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  const dirty = editable && !sameAnswers(answers, stored);
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
   * guard. Confirming drops the answers, so the navigation that follows is not blocked again.
   */
  const confirmed = (action: () => void) =>
    dirty
      ? setPending(() => () => {
          setAnswers(stored);
          action();
        })
      : action();

  const save = useMutation({
    mutationFn: () => {
      if (document === null) throw new Error('This version has no form to save answers to.');
      // Rule 6: the stored form, unchanged, with the new answers.
      return updateDraft(id, versionId, { content: { ...document, data: answers } });
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
    <div className="flex flex-col gap-4">
      <UnsavedChangesGuard
        when={isDirty}
        onSave={saveAnswers}
        onDiscard={() => setAnswers(stored)}
      />
      <ConfirmDiscardDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
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
                // Rule 5: clean AND valid — publishing is what makes these answers the service's.
                disabled={dirty || !valid || busy}
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
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      {document === null ? (
        <p role="alert" className="text-sm text-muted-foreground">
          This version’s content isn’t a document the studio can open.
        </p>
      ) : (
        <div
          data-slot="service-version-content"
          className="rounded-xl border border-border bg-card"
        >
          {/* Rule 2: fillable for a draft, the same runner read-only otherwise. The header owns Save and
              Publish, so the runner's own action bar is left out. */}
          <DocumentRunner
            actions={false}
            disabled={!editable}
            schema={document.schema}
            uischema={variantOf(document)}
            data={editable ? answers : stored}
            onChange={editable ? setAnswers : noop}
            onValidityChange={setValid}
          />
        </div>
      )}
    </div>
  );
}
