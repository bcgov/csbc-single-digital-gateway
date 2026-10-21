import type { DocumentContent } from '@repo/documents/content';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { VersionDropdown } from '@/components/common/version-dropdown';
import { DocumentDeleteButton } from '@/components/common/document-delete-button';
import { ConfirmDiscardDialog } from '@/components/console/confirm-discard-dialog';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { VersionContent } from '@/components/console/version-content';
import { documentContentOf, sameDocumentContent } from '@/lib/studio-content';
import {
  addVersion,
  adminTemplateQueryOptions,
  deleteTemplate,
  deleteTemplateVersion,
  documentTypeLabel,
  editDraft,
  publishVersion,
  type TemplateDeletable,
} from '@/lib/templates';

/**
 * Admin Template detail — a version dropdown + lifecycle actions in the header, over the version's content.
 *
 * Doc 276: the content is authored in the **Document Studio** for a draft and shown READ-ONLY (the studio locked to
 * Preview) for a published or archived version. The page owns saving, publishing and versions; the studio is
 * host-controlled and only reports what the author changes. The API's root rule (every variant a `Form` or a `Funnel`,
 * all matching the default) is the real contract, and the studio only builds roots that satisfy it.
 */
/**
 * Doc 220: this page is the TEMPLATE surface, so every document it opens has authorable permissions.
 * It seeds `capabilities ?? {}` so a template that has never had a rule can still grow one.
 */
const TEMPLATE_NOUN = { full: 'template', short: 'template' } as const;

/** `deletable` less its `template` flag, which the shared button calls `document`. */
const deletableRest = ({ reason, versionIds }: TemplateDeletable) => ({
  versionIds,
  ...(reason === undefined ? {} : { reason }),
});

const seededContent = (document: DocumentContent | null): DocumentContent | null =>
  document === null ? null : { ...document, capabilities: document.capabilities ?? {} };

export function AdminTemplateDetail() {
  const { id } = useParams({ from: '/admin/templates/$id' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery(adminTemplateQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });

  const versions = data?.versions ?? [];
  const latest = versions.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((version) => version.id === selectedId) ?? latest;

  /**
   * The document the studio last reported (doc 218 rule 1). `null` until it mounts and emits its baseline, and
   * reset on every version change so a stale document from the previous version can never read as an edit to this
   * one — the remount alone would leave one render showing the wrong pairing.
   */
  const [live, setLive] = useState<DocumentContent | null>(null);
  /** An action waiting on the discard confirmation (rule 19). Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /**
   * Rule 11: what `dirty` compares against — the content as the server now holds it, rebuilt every render. After a
   * save the refetch makes it equal to `live` again, which is what turns Save draft back off and Publish back on.
   */
  const stored = documentContentOf(selected?.content);
  /**
   * Rule 12: what the studio is SEEDED with — pinned to the version id, deliberately NOT to the query data.
   *
   * The studio seeds once per mount (doc 276), and `key` remounts it per version; pinning the seed to the version
   * id as well means a refetch after a save never hands a re-render a new content identity. Both guards stay.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the version id IS the identity of its content here.
  const seed = useMemo(() => seededContent(stored), [selected?.id]);
  const dirty = live !== null && !sameDocumentContent(live, stored);
  // Rule 20 (feature 177): the guard reads `when` at block time through a ref, because a boolean captured at render
  // can still read stale `true` in the continuation after an awaited save.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  /**
   * Doc 227 rule 7 (doc 225 B1): a deleted template has nothing to save. The refetch after a delete
   * empties `stored`, which reads as dirty against any live document, so without this the guard
   * blocked the navigation away offering to save what was just deleted. A REF, set synchronously
   * before navigating, because a state update may not have re-rendered by then.
   */
  const deleted = useRef(false);
  const isDirty = useCallback(() => !deleted.current && dirtyRef.current, []);

  const selectVersion = (versionId: string) => {
    setSelectedId(versionId);
    setLive(null);
  };
  /** Anything that would throw the current edits away asks first (rule 19). */
  const confirmed = (action: () => void) => (dirty ? setPending(() => action) : action());

  const save = useMutation({
    mutationFn: (document: DocumentContent) => {
      if (selected === undefined) {
        throw new Error('No version selected.');
      }
      return editDraft(id, selected.id, document);
    },
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: (versionId: string) => publishVersion(id, versionId),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: () => addVersion(id, selected?.content ?? {}),
    onSuccess: async (version) => {
      selectVersion(version.id);
      await invalidate();
    },
  });
  const busy = save.isPending || publish.isPending || add.isPending;

  const saveDraft = async () => {
    if (live !== null) {
      await save.mutateAsync(live);
    }
  };

  if (!data) {
    return null;
  }

  const isDraft = selected?.status === 'draft';
  const isLatest = selected?.id === latest?.id;

  return (
    // Doc 218 rule 16: full height — the studio sizes itself to its container, and the admin `<main>` is a flex
    // child with a definite height. The header keeps its own height; the body takes the rest.
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Leaving the page offers the save too — only a draft can ever be dirty, so `saveDraft` is always the right
          action here, and a rejection keeps the dialog open with the reason in view. */}
      <UnsavedChangesGuard when={isDirty} onSave={saveDraft} onDiscard={() => setLive(null)} />
      <ConfirmDiscardDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
      <div className="flex shrink-0 flex-col gap-4">
        <Link
          to="/admin/templates"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Templates
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* The name is generated from the version content, so it can be absent. */}
            <h2 className="text-lg font-semibold">{latest?.title ?? 'Untitled'}</h2>
            <Badge color="yellow">{documentTypeLabel(data.template.type)}</Badge>
            {/* The selected version's status, which the old page said in words beside the editor. A
                disabled runner already shows that it cannot be filled; this says WHY. */}
            {selected ? <Badge color="grey">{selected.status}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            {save.isError ? (
              <p role="alert" className="mr-auto text-sm text-destructive">
                {save.error.message}
              </p>
            ) : null}
            {/* Editing a draft → Save draft / Publish, left of the version controls. */}
            {isDraft && selected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={!dirty || busy}
                  // The rejection is CAUGHT here, and only here: the failure is already on screen through
                  // `save.isError`, and an uncaught one from a click is an unhandled rejection. The guard's
                  // `onSave` deliberately gets the rejecting promise, because its dialog stays open on failure.
                  onClick={() => void saveDraft().catch(() => {})}
                >
                  Save draft
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={dirty || busy}
                  onClick={() => publish.mutate(selected.id)}
                >
                  Publish
                </Button>
              </>
            ) : null}
            <ButtonGroup>
              {!isLatest && latest ? (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => confirmed(() => selectVersion(latest.id))}
                >
                  Go to current
                </Button>
              ) : null}
              {selected ? (
                <VersionDropdown
                  versions={versions}
                  selectedId={selected.id}
                  onSelect={(versionId) => confirmed(() => selectVersion(versionId))}
                />
              ) : null}
            </ButtonGroup>
            {/* Latest version, not a draft → start a new draft version. */}
            {isLatest && !isDraft ? (
              <Button
                size="sm"
                type="button"
                disabled={add.isPending}
                onClick={() => confirmed(() => add.mutate())}
              >
                <Plus className="size-4" aria-hidden />
                New version
              </Button>
            ) : null}
            <DocumentDeleteButton
              noun={TEMPLATE_NOUN}
              deletable={{ document: data.deletable.template, ...deletableRest(data.deletable) }}
              versionCount={versions.length}
              selected={selected}
              deleteDocument={() => deleteTemplate(id)}
              deleteVersion={(versionId) => deleteTemplateVersion(id, versionId)}
              onDeleted={() => {
                // First and synchronously: the navigation below is what the guard would block.
                deleted.current = true;
                void navigate({ to: '/admin/templates' }).then(() => {
                  queryClient.removeQueries({ queryKey: ['admin', 'templates', id] });
                  return queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
                });
              }}
              onVersionDeleted={() => {
                // The deleted version may be the one on screen, so the selection falls back to the
                // latest remaining version.
                selectVersion('');
                void invalidate();
              }}
            />
          </div>
        </div>
      </div>

      <div
        data-slot="template-content"
        className="min-h-0 flex-1 border border-border bg-background"
      >
        <VersionContent
          key={selected?.id}
          // Doc 220: this page IS the template surface — `seededContent` gives every template a capability map
          // (`?? {}`), so one that has never had a rule can still grow one.
          document={seed}
          kind="template"
          type={data.template.type}
          editable={isDraft}
          onDocumentChange={setLive}
        />
      </div>
    </div>
  );
}
