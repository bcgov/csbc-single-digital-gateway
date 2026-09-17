import { Input } from '@repo/ui/input';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import type { Clause, Operator } from '../../types/elements';
import {
  needsValue,
  operatorsFor,
  OPERATOR_LABELS,
  takesList,
  type CriterionField,
} from './criteria';
import type { FlowEditor } from './flow-editor';

// One clause's three pickers, inside the row popover (doc 199 rules 28, 36, 47). Split out of
// `condition-renderer` so the card stays under 300 lines.

// Doc 196 rule 13: under an editor the card is pointer-events-none (presses fall through to the studio frame),
// so the row controls opt back in, and `nodrag` stops xyflow starting a drag from them. The popover is portalled
// out of the canvas and carries its own copy of these (rule 47).
export const ROW_CONTROL_CLASS = 'nodrag pointer-events-auto';

interface ClauseProps {
  readonly clause: Clause;
  readonly fields: readonly CriterionField[];
  readonly editor: FlowEditor;
  readonly conditionId: string;
  readonly rowId: string;
}

/** The value control for `field`'s kind (rule 46): a choice picks from the field's own options. */
function ValueControl({ clause, fields, editor, conditionId, rowId }: ClauseProps) {
  const field = fields.find((candidate) => candidate.key === clause.field);
  // Never `Clause['value']`: that is an OPTIONAL property type, so it admits `undefined`, which
  // `exactOptionalPropertyTypes` then refuses inside the patch. A value control only ever sets a real value.
  const set = (value: string | number | boolean | string[]) =>
    editor.onGesture({
      type: 'set-clause',
      conditionId,
      rowId,
      clauseId: clause.id,
      patch: { value },
    });

  // Rule 36: `in` / `notIn` take a LIST, so the control is a multi-select over the same options.
  if (takesList(clause.operator)) {
    const chosen = new Set(Array.isArray(clause.value) ? clause.value : []);
    return (
      <select
        multiple
        aria-label="Value"
        data-slot="clause-value-list"
        className={`${ROW_CONTROL_CLASS} h-16 w-full rounded-sm border bg-background px-1 py-0.5 text-xs`}
        value={[...chosen]}
        onChange={(event) => set([...event.target.selectedOptions].map((option) => option.value))}
      >
        {(field?.options ?? []).map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field?.kind === 'choice') {
    return (
      <NativeSelect
        size="sm"
        aria-label="Value"
        className={ROW_CONTROL_CLASS}
        value={typeof clause.value === 'string' ? clause.value : ''}
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
        className={`${ROW_CONTROL_CLASS} h-7 w-full text-xs`}
        value={typeof clause.value === 'number' ? String(clause.value) : ''}
        // A half-typed number ("-", "") parses to NaN, which `setClause` would refuse anyway: leave the
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
      className={`${ROW_CONTROL_CLASS} h-7 w-full text-xs`}
      value={typeof clause.value === 'string' ? clause.value : ''}
      onChange={(event) => set(event.target.value)}
    />
  );
}

/**
 * Rules 28, 46-47: one clause as its three pickers. The field picker offers only UPSTREAM fields (rule 6) and
 * the operator picker only that field's kind's operators (rule 1), so the pair can never disagree with the
 * validator. A dangling field or operator (rule 9) is still listed, so the clause shows what it actually names
 * rather than silently reading as something else.
 */
export function ClauseControls({ clause, fields, editor, conditionId, rowId }: ClauseProps) {
  const field = fields.find((candidate) => candidate.key === clause.field);
  const operators = operatorsFor(field?.kind);
  const patch = (changes: Partial<Omit<Clause, 'id'>>) =>
    editor.onGesture({
      type: 'set-clause',
      conditionId,
      rowId,
      clauseId: clause.id,
      patch: changes,
    });

  return (
    <>
      <NativeSelect
        size="sm"
        aria-label="Field"
        className={`${ROW_CONTROL_CLASS} min-w-0`}
        value={clause.field}
        onChange={(event) => patch({ field: event.target.value })}
      >
        {fields.map((candidate) => (
          <NativeSelectOption key={candidate.key} value={candidate.key}>
            {candidate.label}
          </NativeSelectOption>
        ))}
        {field ? null : (
          <NativeSelectOption value={clause.field}>{clause.field}</NativeSelectOption>
        )}
      </NativeSelect>
      <NativeSelect
        size="sm"
        aria-label="Operator"
        className={`${ROW_CONTROL_CLASS} min-w-0`}
        value={clause.operator}
        onChange={(event) => patch({ operator: event.target.value as Operator })}
      >
        {operators.map((operator) => (
          <NativeSelectOption key={operator} value={operator}>
            {OPERATOR_LABELS[operator]}
          </NativeSelectOption>
        ))}
        {operators.includes(clause.operator) ? null : (
          <NativeSelectOption value={clause.operator}>
            {OPERATOR_LABELS[clause.operator] ?? clause.operator}
          </NativeSelectOption>
        )}
      </NativeSelect>
      {/* Rule 3: an operator that needs no value shows no value control at all. */}
      {needsValue(clause.operator) ? (
        <ValueControl
          clause={clause}
          fields={fields}
          editor={editor}
          conditionId={conditionId}
          rowId={rowId}
        />
      ) : (
        <span aria-hidden className="text-xs text-muted-foreground">
          —
        </span>
      )}
    </>
  );
}
