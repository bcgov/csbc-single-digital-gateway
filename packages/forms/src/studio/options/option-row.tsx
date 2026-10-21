import { mdiChevronDown, mdiChevronUp, mdiClose, mdiDragVertical } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import type { KeyboardEvent, RefObject } from 'react';
import type { Option, RowPatch, RowProblem } from './option-draft';

// Doc 206 rules 13-15, 18, 29, 32-33 — one row of the Edit Options dialog.
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
  /** Doc 208 rules 14-16: a drag from this row's handle landed on `position`. */
  onDropAt(fromId: string, position: number): void;
}

/**
 * Doc 208 rule 14: a private drag type, so a drag from anywhere else in the app cannot be mistaken for a
 * row of THIS list. The same shape doc 199 rule 49 uses for Condition rows.
 */
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
  onDropAt,
}: OptionRowProps) {
  const name = `Option ${position}`;

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
      data-slot="option-row"
      /**
       * Rules 14-15: native HTML drag, and the DROP is taken on the row — only the handle starts one, so
       * the text inputs stay selectable. jsdom cannot perform a real drag (doc 199 rule 49), so the pure
       * `moveOption` is what the unit tests assert and the gesture is verified by hand.
       */
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) event.preventDefault();
      }}
      onDrop={(event) => {
        const fromId = event.dataTransfer.getData(DRAG_TYPE);
        if (fromId === '') return;
        event.preventDefault();
        onDropAt(fromId, position - 1);
      }}
      className="grid grid-cols-[auto_auto_1.2fr_1fr_1.4fr_auto] items-center gap-2"
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
          }}
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
