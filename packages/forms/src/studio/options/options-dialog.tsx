import type { UISchemaElement } from '@jsonforms/core';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Kbd } from '@repo/ui/kbd';
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { clauseUsers, deletedConsts, originalConsts, renamedConsts } from './option-cascade';
import {
  draftFrom,
  editRow,
  insertAfter,
  keptRows,
  moveOption,
  removeRow,
  rowProblems,
  savedEntries,
  type Option,
  type RowPatch,
  type RowProblem,
  type SavedEntry,
} from './option-draft';
import { OptionRow } from './option-row';
import type { OptionsTarget } from './options-target';

// Doc 206 rules 5-25, 30-33 — the Edit Options dialog.
//
// Dismissible (`Dialog`, not `AlertDialog`): Cancel, Escape, the close X and an overlay click all discard the
// draft (rule 9), which is why the draft lives HERE and not in `useOptionsEditor` — there is no state to reset.
//
// Rule 30: the handoff's orange accent is INTENT, mapped onto this app's `primary`. Two theme traps it would
// otherwise hit — there is no `secondary` Button variant (Cancel is `outline`), and `bg-muted` is WHITE here,
// so grey surfaces are `bg-gray-10`.

export interface OptionsDialogProps {
  readonly target: OptionsTarget | undefined;
  /** Rule 23: needed to name the Conditions a delete would strand. */
  readonly uischema: UISchemaElement;
  onCancel(): void;
  onSave(
    entries: readonly SavedEntry[],
    renames: ReadonlyMap<string | number, string | number>,
  ): void;
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'option' : 'options'}`;

/**
 * Rules 17-20: why Save is disabled, or `undefined` when it is not. EVERY row problem is named — hand
 * verification found a value the field cannot hold disabling Save with nothing but a red border to explain it,
 * because only duplicates were being counted here.
 */
function problemSummary(
  problems: ReadonlyMap<string, RowProblem>,
  kept: number,
): string | undefined {
  const count = (kind: RowProblem) =>
    [...problems.values()].filter((problem) => problem === kind).length;

  const duplicates = count('duplicate');
  if (duplicates > 0)
    return `${duplicates} duplicate ${duplicates === 1 ? 'value' : 'values'} — values must be unique`;

  const invalid = count('invalid');
  if (invalid > 0)
    return `${invalid} ${invalid === 1 ? 'value is' : 'values are'} not valid for this field`;

  const missing = count('missing-value');
  if (missing > 0) return `${missing} ${missing === 1 ? 'option needs' : 'options need'} a value`;

  return kept === 0 ? 'At least one option is required' : undefined;
}

export function OptionsDialog({ target, uischema, onCancel, onSave }: OptionsDialogProps) {
  if (target === undefined) return null;
  // Keyed by element id: opening another field builds a fresh draft rather than reusing this one's state.
  return (
    <OptionsDialogBody
      key={target.elementId}
      target={target}
      uischema={uischema}
      onCancel={onCancel}
      onSave={onSave}
    />
  );
}

interface BodyProps extends Omit<OptionsDialogProps, 'target'> {
  readonly target: OptionsTarget;
}

function OptionsDialogBody({ target, uischema, onCancel, onSave }: BodyProps) {
  // Rule 10: the draft is built ONCE, from the options the field opened with. `originals` maps those rows'
  // ids to the consts they started as, which is the ONLY thing that makes a rename distinguishable from a
  // delete-plus-add (rule 21) — so it must be pinned to the very array `useState` created, not a second
  // `draftFrom` call, which would mint different ids.
  const opening = useRef<Option[]>([]);
  const [draft, setDraft] = useState<Option[]>(() => {
    opening.current = draftFrom(target.options);
    return opening.current;
  });
  const originals = useMemo(
    () => originalConsts(opening.current, target.options),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the opening list never changes; see above
    [],
  );

  /** Rule 13: which row's Label to focus once the render lands. */
  const [focusId, setFocusId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstLabelRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (focusId === null) return;
    bodyRef.current?.querySelector<HTMLInputElement>(`[data-option-label="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [focusId]);

  const problems = rowProblems(draft, target.type);
  const entries = savedEntries(draft, target.type);
  const kept = keptRows(draft).length;
  const summary = problemSummary(problems, kept);

  const renames = renamedConsts(draft, originals, target.type);
  const deleted = deletedConsts(draft, originals, target.type);
  // Rule 23: reported LIVE, as soon as the row goes, so the author sees it before pressing Save — not as a
  // second click they would learn to dismiss.
  const stranded = useMemo(
    () => clauseUsers(uischema, target.propertyKey, deleted),
    [uischema, target.propertyKey, deleted],
  );

  // These run from events, so they read the current `draft` directly rather than through an updater: React
  // double-invokes updaters, and `insertAfter` mints a new id each call — so a `setFocusId` inside one would
  // aim at a row the committed draft does not hold.
  const edit = (id: string, patch: RowPatch) => setDraft(editRow(draft, id, patch));
  const insert = (id: string | null) => {
    const { draft: next, addedId } = insertAfter(draft, id);
    setDraft(next);
    setFocusId(addedId);
  };
  const removeEmpty = (id: string) => {
    const index = draft.findIndex((row) => row.id === id);
    setDraft(removeRow(draft, id));
    // Rule 14: focus moves to the PREVIOUS row's Label, or the first one when the row was at the top.
    setFocusId(draft[Math.max(0, index - 1)]?.id ?? null);
  };
  const move = (id: string, by: -1 | 1) => {
    const index = draft.findIndex((row) => row.id === id);
    setDraft(moveOption(draft, index, index + by));
  };

  const save = () => {
    if (entries === undefined) return;
    onSave(entries, renames);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Rule 32: ⌘↵ / Ctrl+↵ saves from anywhere in the dialog.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      {/* Rule 32: `DialogContent` is `grid gap-6 px-6 py-4 sm:max-w-xl`, so a wide scrollable panel overrides
          all three and sets BOTH `max-w-*` and `sm:max-w-*`, or the breakpoint wins. */}
      <DialogContent
        onKeyDown={onKeyDown}
        /**
         * Base UI moves focus into the popup on open, defaulting to its first TABBABLE element — which here
         * is a row's "Move down" button (the "Move up" of row 1 is disabled). That both reads wrong and
         * silently overrides any focus set before it lands. The first Label is where an author starts.
         */
        initialFocus={firstLabelRef}
        className="flex max-h-[85vh] w-[51.25rem] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[51.25rem]"
      >
        <DialogHeader showCloseButton className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="text-sm font-bold">Options</DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {target.label} · {target.fieldName}
          </DialogDescription>
        </DialogHeader>

        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {draft.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No options. Add one below.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[auto_1.2fr_1fr_1.4fr_auto] items-center gap-2 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
                <span className="w-6" aria-hidden="true" />
                <span>Label</span>
                <span>Value</span>
                <span>Description</span>
                <span className="w-6" aria-hidden="true" />
              </div>
              {draft.map((option, index) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  {...(index === 0 ? { labelRef: firstLabelRef } : {})}
                  position={index + 1}
                  count={draft.length}
                  problem={problems.get(option.id)}
                  onEdit={edit}
                  onRemove={(id) => setDraft(removeRow(draft, id))}
                  onMove={move}
                  onInsertAfter={insert}
                  onRemoveEmpty={removeEmpty}
                />
              ))}
            </>
          )}

          <Button variant="outline" size="sm" className="w-full" onClick={() => insert(null)}>
            <Icon path={mdiPlus} size="14px" />
            Add option
          </Button>

          {/* Rule 23: named before Save, never auto-repaired (doc 199 rule 9). */}
          {stranded.length > 0 ? (
            <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Removing {deleted.map((value) => String(value)).join(', ')} will leave{' '}
              {stranded.map((use) => use.rowLabel).join(', ')} referring to a choice that no longer
              exists.
            </p>
          ) : null}
        </div>

        <DialogFooter className="items-center border-t border-border px-4 py-3 sm:justify-between">
          <div className="flex flex-col gap-0.5 text-left">
            {summary === undefined ? (
              <span className="text-xs text-muted-foreground">{countLabel(kept)}</span>
            ) : (
              <span className="text-xs text-destructive">{summary}</span>
            )}
            <span className="text-[0.6875rem] text-muted-foreground">
              <Kbd>Enter</Kbd> adds a row · <Kbd>⌘↵</Kbd> saves
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" disabled={entries === undefined} onClick={save}>
              Save options
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
