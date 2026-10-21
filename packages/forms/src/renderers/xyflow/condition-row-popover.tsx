import { mdiClose, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { PopoverContent } from '@repo/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { ConditionRow } from '../../types/elements';
import { ClauseControls, ROW_CONTROL_CLASS } from './criterion-controls';
import type { CriterionField } from './criteria';
import type { FlowEditor } from './flow-editor';

// The row editor (doc 199 rules 47-48): a Condition row's label, its all/any join and its clause grid, in a
// popover anchored to the row rather than inline on the card — which is what keeps the card's width, and so its
// handle positions, from moving while the author works.

export const MATCH_CAPTION = 'Match';
export const DELETE_ROW_LABEL = 'Delete condition';
export const ADD_CLAUSE_LABEL = 'Add clause';

/**
 * Rule 47: the popover is portalled ABOVE the canvas, so it needs its own `nodrag nopan nowheel` — the canvas
 * must not pan or zoom under an open editor, and the classes on the card below it do not reach a portal.
 */
const POPOVER_CLASS = 'nodrag nopan nowheel pointer-events-auto w-72 p-2.5';

interface RowPopoverProps {
  readonly row: ConditionRow;
  readonly fields: readonly CriterionField[];
  readonly editor: FlowEditor;
  readonly conditionId: string;
  readonly onDone: () => void;
}

/** Rule 48: the last clause can never be removed — a row with no clauses never matches (rule 38). */
export function ConditionRowPopover({ row, fields, editor, conditionId, onDone }: RowPopoverProps) {
  const gesture = editor.onGesture;
  const last = row.clauses.length <= 1;

  return (
    <PopoverContent align="start" side="right" className={POPOVER_CLASS} data-slot="row-popover">
      <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        Label
        <Input
          value={row.label}
          aria-label="Condition label"
          className={`${ROW_CONTROL_CLASS} h-7 text-xs font-medium text-foreground`}
          onChange={(event) =>
            gesture({
              type: 'set-row',
              conditionId,
              rowId: row.id,
              patch: { label: event.target.value },
            })
          }
        />
      </label>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{MATCH_CAPTION}</span>
        <ToggleGroup
          size="sm"
          value={[row.match]}
          aria-label="Match all or any"
          className={ROW_CONTROL_CLASS}
          onValueChange={(value) => {
            const next = value[0];
            if (next === 'all' || next === 'any')
              gesture({ type: 'set-row', conditionId, rowId: row.id, patch: { match: next } });
          }}
        >
          <ToggleGroupItem value="all" aria-label="all">
            all
          </ToggleGroupItem>
          <ToggleGroupItem value="any" aria-label="any">
            any
          </ToggleGroupItem>
        </ToggleGroup>
        <span>of:</span>
      </div>

      <ul className="mt-1.5 flex flex-col gap-1" data-slot="clause-grid">
        {row.clauses.map((clause) => (
          <li
            key={clause.id}
            data-slot="clause-row"
            className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1"
          >
            <ClauseControls
              clause={clause}
              fields={fields}
              editor={editor}
              conditionId={conditionId}
              rowId={row.id}
            />
            <button
              type="button"
              aria-label="Remove clause"
              data-slot="clause-remove"
              disabled={last}
              className={`${ROW_CONTROL_CLASS} rounded-sm text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() =>
                gesture({ type: 'remove-clause', conditionId, rowId: row.id, clauseId: clause.id })
              }
            >
              <Icon path={mdiClose} size="14px" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        data-slot="clause-add"
        className={`${ROW_CONTROL_CLASS} mt-1.5 flex items-center gap-1 text-xs font-medium text-primary`}
        onClick={() => gesture({ type: 'add-clause', conditionId, rowId: row.id })}
      >
        <Icon path={mdiPlus} size="14px" />
        {ADD_CLAUSE_LABEL}
      </button>

      <div className="mt-2.5 flex items-center justify-between border-t pt-2">
        <button
          type="button"
          data-slot="row-delete"
          className={`${ROW_CONTROL_CLASS} text-xs font-medium text-destructive hover:underline`}
          onClick={() => {
            gesture({ type: 'remove-row', conditionId, rowId: row.id });
            onDone();
          }}
        >
          {DELETE_ROW_LABEL}
        </button>
        <Button size="sm" className={ROW_CONTROL_CLASS} onClick={onDone}>
          Done
        </Button>
      </div>
    </PopoverContent>
  );
}
