import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiCallSplit, mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Input } from '@repo/ui/input';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { useContext } from 'react';
import type { Criterion, Operator } from '../../types/elements';
import { useConditionOutputs } from './condition-outputs';
import { needsValue, operatorsFor, OPERATOR_LABELS, type CriterionField } from './criteria';
import { AddAffordance } from './add-affordance';
import { FlowContext } from './flow-context';
import { useFlowEditor, type FlowEditor } from './flow-editor';
import { CONDITION_PLACEMENT_MESSAGE, criteriaOf, DEFAULT_HANDLE } from './flow-elements';

// The Condition card (doc 199 rules 19-21, 24-26). View-only it SUMMARISES each criterion; under a Flow editor
// each row becomes the pickers that author it, and every unconnected output grows a + (rule 20).

/** Doc 199 rule 26: why `+ Add criterion` is disabled — any criterion it created would be invalid. */
export const NO_UPSTREAM_FIELDS_HINT =
  'Connect this condition after a stage with fields to add a criterion.';

// Doc 196 rule 13: under an editor the card is pointer-events-none (presses fall through to the studio frame),
// so the row controls opt back in, and `nodrag` stops xyflow starting a drag from them.
const ROW_CONTROL_CLASS = 'nodrag pointer-events-auto';

/** An element's `label` when a non-empty string, else `fallback`. */
function labelOf(element: UISchemaElement, fallback: string): string {
  const label = (element as { label?: unknown }).label;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback;
}

/**
 * Rule 19: a criterion read back in words. The field is shown by its KEY here — resolving it to the authored
 * label needs the document's schema and the upstream walk, which only an editor can supply.
 */
export function criterionSummary(criterion: Criterion): string {
  const { field, operator, value } = criterion;
  return value === undefined ? `${field} ${operator}` : `${field} ${operator} ${String(value)}`;
}

interface RowProps {
  readonly criterion: Criterion;
  readonly fields: readonly CriterionField[];
  readonly editor: FlowEditor;
  readonly conditionId: string;
}

/** The value control for `field`'s kind (rule 26): a choice picks from the field's own options. */
function ValueControl({ criterion, fields, editor, conditionId }: RowProps) {
  const field = fields.find((candidate) => candidate.key === criterion.field);
  // Never `Criterion['value']`: that is an OPTIONAL property type, so it admits `undefined`, which
  // `exactOptionalPropertyTypes` then refuses inside the patch. A value control only ever sets a real value.
  const set = (value: string | number | boolean) =>
    editor.onGesture({
      type: 'set-criterion',
      conditionId,
      criterionId: criterion.id,
      patch: { value },
    });

  if (field?.kind === 'choice') {
    return (
      <NativeSelect
        size="sm"
        aria-label="Value"
        className={ROW_CONTROL_CLASS}
        value={typeof criterion.value === 'string' ? criterion.value : ''}
        onChange={(event) => set(event.target.value)}
      >
        {(field.options ?? []).map((option) => (
          <NativeSelectOption key={String(option.value)} value={String(option.value)}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }

  if (field?.kind === 'number') {
    return (
      <Input
        type="number"
        aria-label="Value"
        className={`${ROW_CONTROL_CLASS} h-7 w-16 text-xs`}
        value={typeof criterion.value === 'number' ? String(criterion.value) : ''}
        // A half-typed number ("-", "") parses to NaN, which `setCriterion` would refuse anyway: leave the
        // document alone until the field holds a real one.
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) set(next);
        }}
      />
    );
  }

  return (
    <Input
      type="text"
      aria-label="Value"
      className={`${ROW_CONTROL_CLASS} h-7 w-20 text-xs`}
      value={typeof criterion.value === 'string' ? criterion.value : ''}
      onChange={(event) => set(event.target.value)}
    />
  );
}

/**
 * Rules 25-26, 28: one criterion as its three pickers. The field picker offers only UPSTREAM fields (rule 6)
 * and the operator picker only that field's kind's operators (rule 1), so the pair can never disagree with the
 * validator. A dangling field or operator (rule 9) is still listed, so the row shows what it actually names
 * rather than silently reading as something else.
 */
function CriterionControls({ criterion, fields, editor, conditionId }: RowProps) {
  const field = fields.find((candidate) => candidate.key === criterion.field);
  const operators = operatorsFor(field?.kind);
  const patch = (changes: Partial<Omit<Criterion, 'id'>>) =>
    editor.onGesture({
      type: 'set-criterion',
      conditionId,
      criterionId: criterion.id,
      patch: changes,
    });

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      <NativeSelect
        size="sm"
        aria-label="Field"
        className={ROW_CONTROL_CLASS}
        value={criterion.field}
        onChange={(event) => patch({ field: event.target.value })}
      >
        {fields.map((candidate) => (
          <NativeSelectOption key={candidate.key} value={candidate.key}>
            {candidate.label}
          </NativeSelectOption>
        ))}
        {field ? null : (
          <NativeSelectOption value={criterion.field}>{criterion.field}</NativeSelectOption>
        )}
      </NativeSelect>
      <NativeSelect
        size="sm"
        aria-label="Operator"
        className={ROW_CONTROL_CLASS}
        value={criterion.operator}
        onChange={(event) => patch({ operator: event.target.value as Operator })}
      >
        {operators.map((operator) => (
          <NativeSelectOption key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </NativeSelectOption>
        ))}
        {operators.includes(criterion.operator) ? null : (
          <NativeSelectOption value={criterion.operator}>
            {OPERATOR_LABELS[criterion.operator] ?? criterion.operator}
          </NativeSelectOption>
        )}
      </NativeSelect>
      {/* Rule 3: an operator that needs no value shows no value control at all. */}
      {needsValue(criterion.operator) ? (
        <ValueControl
          criterion={criterion}
          fields={fields}
          editor={editor}
          conditionId={conditionId}
        />
      ) : null}
    </div>
  );
}

/** Rule 20: the + that wires an unconnected output to a new Stage, carrying the output as the edge's handle. */
function OutputAdd({
  editor,
  conditionId,
  handle,
}: {
  readonly editor: FlowEditor;
  readonly conditionId: string;
  readonly handle: string;
}) {
  return (
    <AddAffordance
      label="Add a stage"
      className="shrink-0"
      onAdd={() =>
        editor.onGesture(
          // The DEFAULT output leaves by no criterion, so its edge carries no handle (rule 18).
          handle === DEFAULT_HANDLE
            ? { type: 'append', stageId: conditionId, kind: 'stage' }
            : { type: 'append', stageId: conditionId, kind: 'stage', sourceHandle: handle },
        )
      }
    />
  );
}

/**
 * The Condition layout renderer (doc 199 rules 19, 21). Outside a Flow it renders a placement error, exactly as a
 * Stage does. Inside one — dispatched by its Condition node — a card: the label, then a row per criterion, then
 * the default row that every Condition ends with.
 */
function ConditionLayout({ uischema, visible }: LayoutProps) {
  const flow = useContext(FlowContext);
  const editor = useFlowEditor();
  // Rule 20: which outputs are already wired is derived on the canvas and handed down by the Condition node.
  const connected = useConditionOutputs();
  if (!flow) {
    return (
      <p role="alert" data-slot="condition-placement-error" className="text-sm text-destructive">
        {CONDITION_PLACEMENT_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;
  const criteria = criteriaOf(uischema);
  const conditionId = editor ? editor.idOf(uischema) : null;
  const fields = editor && conditionId !== null ? editor.fieldsFor(conditionId) : [];
  const wired = (handle: string) => connected?.has(handle) ?? true;

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
        <span className="truncate">{labelOf(uischema, 'Condition')}</span>
      </div>
      <ul className="flex flex-col gap-1.5 p-2">
        {criteria.map((criterion) => (
          <li
            key={criterion.id}
            data-slot="condition-criterion-row"
            className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {editor && conditionId !== null ? (
              <>
                <CriterionControls
                  criterion={criterion}
                  fields={fields}
                  editor={editor}
                  conditionId={conditionId}
                />
                <button
                  type="button"
                  aria-label="Remove criterion"
                  data-slot="condition-criterion-remove"
                  className={`${ROW_CONTROL_CLASS} shrink-0 rounded-sm text-muted-foreground hover:text-destructive`}
                  onClick={() =>
                    editor.onGesture({
                      type: 'remove-criterion',
                      conditionId,
                      criterionId: criterion.id,
                    })
                  }
                >
                  <Icon path={mdiDeleteOutline} size="14px" />
                </button>
                {wired(criterion.id) ? null : (
                  <OutputAdd editor={editor} conditionId={conditionId} handle={criterion.id} />
                )}
              </>
            ) : (
              <span className="truncate">{criterionSummary(criterion)}</span>
            )}
          </li>
        ))}
        {/* Rule 26: a criterion is only ever born COMPLETE, so with nothing upstream there is nothing to add. */}
        {editor && conditionId !== null ? (
          <li>
            <button
              type="button"
              aria-label="Add criterion"
              data-slot="condition-add-criterion"
              disabled={fields.length === 0}
              {...(fields.length === 0 ? { title: NO_UPSTREAM_FIELDS_HINT } : {})}
              className={`${ROW_CONTROL_CLASS} flex w-full items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:border-ring hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted-foreground`}
              onClick={() => editor.onGesture({ type: 'add-criterion', conditionId })}
            >
              <Icon path={mdiPlus} size="14px" className="shrink-0" />
              <span>Add criterion</span>
            </button>
            {fields.length === 0 ? (
              <p
                data-slot="condition-no-fields"
                className="px-2 pt-1 text-xs text-muted-foreground"
              >
                {NO_UPSTREAM_FIELDS_HINT}
              </p>
            ) : null}
          </li>
        ) : null}
        {/* Every Condition ends with the default: what an answer matching no criterion follows (rule 13). */}
        <li
          data-slot="condition-default-row"
          className="flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground"
        >
          <span className="min-w-0 flex-1 truncate">Otherwise</span>
          {editor && conditionId !== null && !wired(DEFAULT_HANDLE) ? (
            <OutputAdd editor={editor} conditionId={conditionId} handle={DEFAULT_HANDLE} />
          ) : null}
        </li>
      </ul>
    </div>
  );
}

export const ConditionLayoutRenderer = withJsonFormsLayoutProps(ConditionLayout);
