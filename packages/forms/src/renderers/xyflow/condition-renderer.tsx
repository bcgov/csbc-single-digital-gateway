import type { JsonSchema, LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiAlertOutline, mdiCallSplit, mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';
import { useContext } from 'react';
import type { Criterion } from '../../types/elements';
import { useConditionOutputs } from './condition-outputs';
import { decisionFieldHint, optionalDecisionFields, type CriterionField } from './criteria';
import { CriterionControls, ROW_CONTROL_CLASS } from './criterion-controls';
import { AddAffordance } from './add-affordance';
import { FlowContext } from './flow-context';
import { useFlowEditor, type FlowEditor } from './flow-editor';
import { CONDITION_PLACEMENT_MESSAGE, criteriaOf, DEFAULT_HANDLE } from './flow-elements';

// The Condition card (doc 199 rules 19-21, 24-26). View-only it SUMMARISES each criterion; under a Flow editor
// each row becomes the pickers that author it, and every unconnected output grows a + (rule 20).

/** Doc 199 rule 26: why `+ Add criterion` is disabled — any criterion it created would be invalid. */
export const NO_UPSTREAM_FIELDS_HINT =
  'Connect this condition after a stage with fields to add a criterion.';

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
 * Doc 199 rule 34: a gold icon in the criterion row whose tooltip says the field may be left blank. An icon, not a
 * line of text: the canvas spaces ranks a FIXED distance apart (doc 198), so a taller card collides with the stages
 * below it. The icon's accessible name is the whole hint, so it never depends on the tooltip being seen.
 */
function OptionalFieldHint({ field }: { readonly field: CriterionField | undefined }) {
  if (field === undefined) return null;
  const hint = decisionFieldHint(field.label);
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={hint}
        data-slot="condition-optional-field-hint"
        className={`${ROW_CONTROL_CLASS} shrink-0 rounded-sm text-bcgov-gold`}
      >
        <Icon path={mdiAlertOutline} size="14px" />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Rule 19: a criterion read back in words. The field is shown by its KEY here — resolving it to the authored
 * label needs the document's schema and the upstream walk, which only an editor can supply.
 */
export function criterionSummary(criterion: Criterion): string {
  const { field, operator, value } = criterion;
  return value === undefined ? `${field} ${operator}` : `${field} ${operator} ${String(value)}`;
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
  // Doc 199 rule 34: the FIRST criterion naming each optional field carries its hint, so a field is flagged once.
  const optional = editor
    ? optionalDecisionFields(criteria, fields, requiredKeysOf(flow.schema))
    : [];
  const hintFor = (criterion: Criterion) => {
    const field = optional.find((candidate) => candidate.key === criterion.field);
    const first = criteria.find((other) => other.field === criterion.field);
    return field !== undefined && first?.id === criterion.id ? field : undefined;
  };

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
                <OptionalFieldHint field={hintFor(criterion)} />
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
