import { mdiChevronDown, mdiChevronUp, mdiClose, mdiDragVertical } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { useRef, type KeyboardEvent, type RefObject } from 'react';
import type { DropEdge, Option, RowPatch, RowProblem } from './option-draft';

// Doc 255 rule 5 (ported from @repo/forms doc 206 rules 13-15, 18, 29, 32-33) — one row of the Edit Options dialog.
//
// Rule 32: the duplicate/invalid styling is `aria-invalid` on the `Input`, which already carries
// `aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20`. Hand-written red
// classes would drift from every other invalid field in the app.

const PROBLEM_MESSAGES: Readonly<Record<RowProblem, string>> = {
  duplicate: 'Duplicate value',
  invalid: 'Not a valid value for this field',
  'missing-value': 'A value is required',
};

export interface OptionRowProps {
  readonly option: Option;
  /** 1-based, for the accessible names — the rows have no visible labels of their own. */
  readonly position: number;
  readonly count: number;
  readonly problem: RowProblem | undefined;
  /** Set on the FIRST row only, so the dialog can take initial focus there (see `initialFocus`). */
  readonly labelRef?: RefObject<HTMLInputElement | null>;
  onEdit(id: string, patch: RowPatch): void;
  onRemove(id: string): void;
  onMove(id: string, by: -1 | 1): void;
  /** Rule 13: Enter inserts a row below this one. */
  onInsertAfter(id: string): void;
  /** Rule 14: Backspace in a wholly empty row deletes it. */
  onRemoveEmpty(id: string): void;
  /** Doc 255 rule 5b: this row is being dragged — drawn faded. */
  readonly dragging: boolean;
  /** Doc 255 rule 5b: a dragged row would land on this edge of this row — drawn as a line there. */
  readonly dropEdge: DropEdge | undefined;
  onDragStartRow(id: string): void;
  /** The pointer is over this row's top or bottom half during a row drag. */
  onDragOverRow(id: string, edge: DropEdge): void;
  onDropRow(): void;
  onDragEndRow(): void;
}

/** The line a drop would land on (rule 5b): 2px of the primary colour, centred in the gap above or below the row. */
const DROP_LINE: Readonly<Record<DropEdge, string>> = {
  before:
    'before:absolute before:inset-x-0 before:-top-[5px] before:h-0.5 before:rounded-full before:bg-primary',
  after:
    'after:absolute after:inset-x-0 after:-bottom-[5px] after:h-0.5 after:rounded-full after:bg-primary',
};

/** A private drag type, so a drag from anywhere else in the app cannot be mistaken for a row of THIS list. */
const DRAG_TYPE = 'text/option-row';

const isEmptyRow = (option: Option) =>
  option.label === '' && option.value === '' && (option.description ?? '') === '';

export function OptionRow({
  option,
  position,
  count,
  problem,
  labelRef,
  onEdit,
  onRemove,
  onMove,
  onInsertAfter,
  onRemoveEmpty,
  dragging,
  dropEdge,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
}: OptionRowProps) {
  const name = `Option ${position}`;
  const rowRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Rule 13: the fast-entry path. Never submits — the dialog has no form.
      event.preventDefault();
      onInsertAfter(option.id);
      return;
    }
    // Rule 14: only when the WHOLE row is empty, and never the last one standing.
    if (event.key === 'Backspace' && isEmptyRow(option) && count > 1) {
      event.preventDefault();
      onRemoveEmpty(option.id);
    }
  };

  return (
    <div
      ref={rowRef}
      data-slot="option-row"
      data-dragging={dragging || undefined}
      data-drop-edge={dropEdge}
      /**
       * Native HTML drag, and the DROP is taken on the row — only the handle starts one, so the text inputs stay
       * selectable. Over a row, its top half drops before it and its bottom half after (rule 5b). jsdom cannot perform
       * a real drag, so the pure `dropIndex` / `moveOption` are what the unit tests assert.
       */
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const box = event.currentTarget.getBoundingClientRect();
        onDragOverRow(option.id, event.clientY < box.top + box.height / 2 ? 'before' : 'after');
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        event.preventDefault();
        onDropRow();
      }}
      className={`relative grid grid-cols-[auto_auto_1.2fr_1fr_1.4fr_auto] items-center gap-2 transition-opacity ${
        dragging ? 'opacity-40' : ''
      } ${dropEdge === undefined ? '' : DROP_LINE[dropEdge]}`}
    >
      <div className="flex shrink-0 items-center">
        <span
          role="button"
          tabIndex={-1}
          aria-label={`Reorder ${name.toLowerCase()}`}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE, option.id);
            event.dataTransfer.effectAllowed = 'move';
            // The whole row is what is carried, held where it was grabbed — not just the 14px handle.
            const row = rowRef.current;
            if (row !== null) {
              const box = row.getBoundingClientRect();
              event.dataTransfer.setDragImage(
                row,
                event.clientX - box.left,
                event.clientY - box.top,
              );
            }
            onDragStartRow(option.id);
          }}
          onDragEnd={onDragEndRow}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <Icon path={mdiDragVertical} size="14px" />
        </span>
      </div>
      <div className="flex shrink-0 flex-col">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Move ${name.toLowerCase()} up`}
          disabled={position === 1}
          onClick={() => onMove(option.id, -1)}
        >
          <Icon path={mdiChevronUp} size="14px" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Move ${name.toLowerCase()} down`}
          disabled={position === count}
          onClick={() => onMove(option.id, 1)}
        >
          <Icon path={mdiChevronDown} size="14px" />
        </Button>
      </div>

      <Input
        ref={labelRef}
        aria-label={`${name} label`}
        data-option-label={option.id}
        placeholder="Label"
        className="h-8 text-sm"
        value={option.label}
        onKeyDown={onKeyDown}
        onChange={(event) => onEdit(option.id, { label: event.target.value })}
      />
      <Input
        aria-label={`${name} value`}
        placeholder="value"
        className="h-8 font-mono text-xs"
        value={option.value}
        aria-invalid={problem !== undefined}
        title={problem === undefined ? undefined : PROBLEM_MESSAGES[problem]}
        onKeyDown={onKeyDown}
        onChange={(event) => onEdit(option.id, { value: event.target.value })}
      />
      <Input
        aria-label={`${name} description`}
        placeholder="Helper text (optional)"
        className="h-8 text-sm"
        value={option.description ?? ''}
        onKeyDown={onKeyDown}
        onChange={(event) => onEdit(option.id, { description: event.target.value })}
      />

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${name.toLowerCase()}`}
        onClick={() => onRemove(option.id)}
      >
        <Icon path={mdiClose} size="14px" />
      </Button>
    </div>
  );
}
