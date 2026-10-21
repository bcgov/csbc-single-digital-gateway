import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Dialog, DialogContent } from '@repo/ui/dialog';
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Uischema } from '../document-types';
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
import { carryIds, type ParsedRow } from './option-import';
import { OptionRow } from './option-row';
import { useRowDrag } from './use-row-drag';
import {
  OptionsDialogFooter,
  OptionsDialogHeader,
  type OptionsPage,
} from './options-dialog-chrome';
import { OptionsImportPage, type ImportMode } from './options-import-page';
import type { OptionsTarget } from './options-target';

// Doc 255 rules 4-12 — the Edit Options dialog: a list page, and an import page it pushes to.
//
// Dismissible (`Dialog`, not `AlertDialog`): Cancel, Escape, the close X and an overlay click all discard the draft,
// which is why the draft lives HERE — there is no state to reset elsewhere.

export interface OptionsDialogProps {
  /** `undefined` renders nothing (the dialog is closed). */
  readonly target: OptionsTarget | undefined;
  /** The variant — to name the Conditions a delete would strand (rule 12). */
  readonly uischema: Uischema;
  onCancel(): void;
  onSave(
    entries: readonly SavedEntry[],
    renames: ReadonlyMap<string | number, string | number>,
  ): void;
}

/** Rule 6: why Save is disabled, naming EVERY kind of row problem, or `undefined` when it is not. */
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
  // Keyed by element: opening another field builds a fresh draft rather than reusing this one's state.
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

function OptionsDialogBody({
  target,
  uischema,
  onCancel,
  onSave,
}: Omit<OptionsDialogProps, 'target'> & { readonly target: OptionsTarget }) {
  // The draft is built ONCE, from the options the field opened with. `originals` maps those rows' ids to the consts
  // they started as — the only thing that makes a rename distinguishable from a delete-plus-add (rule 11) — so it is
  // pinned to the very array `useState` created, never a second `draftFrom` call, which would mint different ids.
  const opening = useRef<Option[]>([]);
  const [draft, setDraft] = useState<Option[]>(() => {
    opening.current = draftFrom(target.options);
    return opening.current;
  });
  const originals = useMemo(
    () => originalConsts(opening.current, target.options),
    // The opening list never changes; see above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [page, setPage] = useState<OptionsPage>('list');
  // Rule 8: what was pasted, and how, survive Back and a return to the import page.
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('append');

  // Which row's Label to focus once the render lands (rules 5, 10).
  const [focusId, setFocusId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstLabelRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (focusId === null) return;
    bodyRef.current?.querySelector<HTMLInputElement>(`[data-option-label="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [focusId, page]);

  const problems = rowProblems(draft, target.type);
  const entries = savedEntries(draft, target.type);
  const kept = keptRows(draft).length;
  const renames = renamedConsts(draft, originals, target.type);
  const deleted = deletedConsts(draft, originals, target.type);
  // Rule 12: reported LIVE, as soon as the row goes, before Save.
  const stranded = useMemo(
    () => clauseUsers(uischema, target.propertyKey, deleted),
    [uischema, target.propertyKey, deleted],
  );

  // These run from events, so they read the current `draft` rather than through an updater: React double-invokes
  // updaters, and `insertAfter` mints a new id on each call.
  const edit = (id: string, patch: RowPatch) => setDraft(editRow(draft, id, patch));
  const insert = (id: string | null) => {
    const { draft: next, addedId } = insertAfter(draft, id);
    setDraft(next);
    setFocusId(addedId);
  };
  const removeEmpty = (id: string) => {
    const index = draft.findIndex((row) => row.id === id);
    setDraft(removeRow(draft, id));
    // Focus moves to the PREVIOUS row's Label, or the first when the row was at the top.
    setFocusId(draft[Math.max(0, index - 1)]?.id ?? null);
  };
  const move = (id: string, by: -1 | 1) => {
    const index = draft.findIndex((row) => row.id === id);
    setDraft(moveOption(draft, index, index + by));
  };
  const rowDrag = useRowDrag(draft, setDraft);

  /** Rule 10: imported rows land in the draft — appended or replacing — keeping identity by value, then back to the list. */
  const onImport = (rows: readonly ParsedRow[], mode: ImportMode) => {
    const existing = mode === 'replace' ? [] : draft.map((row) => ({ ...row }));
    const next = carryIds([...existing, ...rows], draft);
    setDraft(next);
    setImportText('');
    setPage('list');
    setFocusId(next[existing.length]?.id ?? null);
  };

  const save = () => {
    if (entries !== undefined) onSave(entries, renames);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Rule 4: ⌘↵ / Ctrl+↵ saves from anywhere on the list page.
    if (page === 'list' && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
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
      {/* `DialogContent` is `grid gap-6 px-6 py-4 sm:max-w-xl`: a wide scrolling panel overrides all three, BOTH
          `max-w-*` and `sm:max-w-*`, or the breakpoint wins. */}
      <DialogContent
        onKeyDown={onKeyDown}
        // Base UI focuses the first TABBABLE element (a row's "Move down") by default; an author starts at a Label.
        initialFocus={firstLabelRef}
        className="flex max-h-[85vh] w-[51.25rem] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[51.25rem]"
      >
        <OptionsDialogHeader
          target={target}
          page={page}
          onImport={() => setPage('import')}
          onBack={() => setPage('list')}
        />
        {page === 'import' ? (
          <OptionsImportPage
            text={importText}
            mode={importMode}
            onText={setImportText}
            onMode={setImportMode}
            onImport={onImport}
          />
        ) : (
          <>
            <div
              ref={bodyRef}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
            >
              {draft.length === 0 ? (
                <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  No options. Add one below.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[auto_auto_1.2fr_1fr_1.4fr_auto] items-center gap-2 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
                    <span className="w-4" aria-hidden="true" />
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
                      {...rowDrag.propsFor(option.id)}
                    />
                  ))}
                </>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => insert(null)}>
                <Icon path={mdiPlus} size="14px" />
                Add option
              </Button>
              {/* Rule 12: named before Save, never auto-repaired. */}
              {stranded.length > 0 && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  Removing {deleted.map((value) => String(value)).join(', ')} will leave{' '}
                  {stranded.map((use) => `${use.rowLabel} (${use.conditionLabel})`).join(', ')}{' '}
                  referring to a choice that no longer exists.
                </p>
              )}
            </div>
            <OptionsDialogFooter
              summary={problemSummary(problems, kept)}
              kept={kept}
              canSave={entries !== undefined}
              onCancel={onCancel}
              onSave={save}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
