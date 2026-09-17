import type { JsonSchema, LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiCallSplit, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useContext, useState } from 'react';
import type { ConditionRow } from '../../types/elements';
import { useConditionHover } from './condition-hover';
import { useConditionOutputs } from './condition-outputs';
import { ConditionRow as Row, OutputAdd } from './condition-row';
import { optionalDecisionFields } from './criteria';
import { SWITCH_UNAVAILABLE_HINT, switchField } from './condition-rows';
import { ROW_CONTROL_CLASS } from './criterion-controls';
import { FlowContext } from './flow-context';
import { useFlowEditor } from './flow-editor';
import {
  clausesIn,
  conditionMode,
  CONDITION_PLACEMENT_MESSAGE,
  DEFAULT_HANDLE,
  rowsOf,
} from './flow-elements';

// The Condition card (doc 199 rules 42-48). View-only it LISTS each row with its summary; under a Flow editor a
// row opens its popover, every unwired output grows a + (rule 20), and the footer adds a row.

/** Doc 199 rule 46: why `+ Add condition` is disabled — any clause it created would be invalid. */
export const NO_UPSTREAM_FIELDS_HINT =
  'Connect this condition after a stage with fields to add a condition.';

/** Rule 42: the header's mode hint. Rows are evaluated top to bottom and the first match wins (rule 39). */
export const MODE_HINT = 'first match';
/** Rule 45: the pinned Else row's label and its right-side hint. */
export const ELSE_LABEL = 'Else';
export const ELSE_HINT = 'no match';
export const ADD_ROW_LABEL = 'Add condition';
/** Rule 51: switch mode's rows are values of one field, so its footer says so. */
export const ADD_VALUE_LABEL = 'Add value';

/** An element's `label` when a non-empty string, else `fallback`. */
function labelOf(element: UISchemaElement, fallback: string): string {
  const label = (element as { label?: unknown }).label;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback;
}

/** The schema's top-level `required` keys, ignoring anything that is not a string list. */
function requiredKeysOf(schema: JsonSchema): ReadonlySet<string> {
  const required = (schema as { required?: unknown }).required;
  return new Set(
    Array.isArray(required) ? required.filter((key): key is string => typeof key === 'string') : [],
  );
}

/**
 * The Condition layout renderer (rules 21, 42-46). Outside a Flow it renders a placement error, exactly as a
 * Stage does. Inside one — dispatched by its Condition node — a card: the header, a row per branch, the pinned
 * Else row that every Condition ends with, and the footer that adds a branch.
 */
function ConditionLayout({ uischema, visible }: LayoutProps) {
  const flow = useContext(FlowContext);
  const editor = useFlowEditor();
  // Rule 20: which outputs are already wired is derived on the canvas and handed down by the Condition node.
  const connected = useConditionOutputs();
  const hover = useConditionHover();
  const [openRow, setOpenRow] = useState<string | null>(null);
  if (!flow) {
    return (
      <p role="alert" data-slot="condition-placement-error" className="text-sm text-destructive">
        {CONDITION_PLACEMENT_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;

  const rows = rowsOf(uischema);
  // Rule 51: the toggle is offered only while switching is LOSSLESS — every row one `equals` clause on one
  // field. A Condition already in switch mode always satisfies that, so it can always switch back.
  const oneField = switchField(rows);
  const mode = oneField === undefined ? 'rules' : conditionMode(uischema);
  const conditionId = editor ? editor.idOf(uischema) : null;
  const nodeId = typeof uischema.options?.['id'] === 'string' ? uischema.options['id'] : '';
  const fields = editor && conditionId !== null ? editor.fieldsFor(conditionId) : [];
  const wired = (handle: string) => connected?.has(handle) ?? true;
  // Rule 34: the FIRST row naming each optional field carries its hint, so a field is flagged once.
  const optional = editor
    ? optionalDecisionFields(clausesIn(uischema), fields, requiredKeysOf(flow.schema))
    : [];
  const hintFor = (row: ConditionRow) =>
    optional.find(
      (field) =>
        row.clauses.some((clause) => clause.field === field.key) &&
        rows.find((other) => other.clauses.some((clause) => clause.field === field.key))?.id ===
          row.id,
    );

  return (
    <div
      data-slot="condition-card"
      className="w-72 rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div
        data-slot="condition-label"
        className="flex items-center gap-1.5 border-b px-3 py-2 text-sm font-semibold"
      >
        <Icon path={mdiCallSplit} size="16px" className="shrink-0 text-muted-foreground" />
        <span data-slot="condition-title" className="min-w-0 flex-1 truncate">
          {labelOf(uischema, 'Condition')}
        </span>
        {editor && conditionId !== null ? (
          <button
            type="button"
            data-slot="condition-mode"
            disabled={oneField === undefined}
            {...(oneField === undefined ? { title: SWITCH_UNAVAILABLE_HINT } : {})}
            className={`${ROW_CONTROL_CLASS} shrink-0 text-[11px] font-normal text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={() =>
              editor.onGesture({
                type: 'set-mode',
                conditionId,
                mode: mode === 'switch' ? 'rules' : 'switch',
              })
            }
          >
            {mode === 'switch' ? (oneField ?? MODE_HINT) : MODE_HINT}
          </button>
        ) : (
          <span
            data-slot="condition-mode"
            className="shrink-0 text-[11px] font-normal text-muted-foreground"
          >
            {MODE_HINT}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-0.5 p-1.5">
        {rows.map((row, index) => (
          <Row
            key={row.id}
            row={row}
            index={index}
            onReorder={(rowId, toIndex) =>
              editor?.onGesture({
                type: 'move-row',
                conditionId: conditionId ?? '',
                rowId,
                toIndex,
              })
            }
            fields={fields}
            editor={editor}
            conditionId={conditionId}
            nodeId={nodeId}
            hint={hintFor(row)}
            wired={wired(row.id)}
            open={openRow === row.id}
            onOpenChange={(open) => setOpenRow(open ? row.id : null)}
          />
        ))}
        {/* Rule 45: the Else row is pinned last, never draggable and never deletable. */}
        <li
          data-slot="condition-default-row"
          onPointerEnter={() => hover.setHovered(nodeId, DEFAULT_HANDLE)}
          onPointerLeave={() => hover.setHovered(null, null)}
          className="mt-1 flex items-center gap-1.5 border-t border-dashed px-2 pt-2 text-xs"
        >
          <span className="min-w-0 flex-1 truncate italic text-warning-text">{ELSE_LABEL}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{ELSE_HINT}</span>
          {editor && conditionId !== null && !wired(DEFAULT_HANDLE) ? (
            <OutputAdd editor={editor} conditionId={conditionId} handle={DEFAULT_HANDLE} />
          ) : null}
        </li>
      </ul>
      {/* Rule 46: a clause is only ever born COMPLETE, so with nothing upstream there is nothing to add. */}
      {editor && conditionId !== null ? (
        <div className="px-3 pb-2">
          <button
            type="button"
            data-slot="condition-add-criterion"
            disabled={fields.length === 0}
            {...(fields.length === 0 ? { title: NO_UPSTREAM_FIELDS_HINT } : {})}
            className={`${ROW_CONTROL_CLASS} flex items-center gap-1 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60`}
            onClick={() => editor.onGesture({ type: 'add-row', conditionId })}
          >
            <Icon path={mdiPlus} size="14px" className="shrink-0" />
            <span>{mode === 'switch' ? ADD_VALUE_LABEL : ADD_ROW_LABEL}</span>
          </button>
          {fields.length === 0 ? (
            <p data-slot="condition-no-fields" className="pt-1 text-xs text-muted-foreground">
              {NO_UPSTREAM_FIELDS_HINT}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const ConditionLayoutRenderer = withJsonFormsLayoutProps(ConditionLayout);
