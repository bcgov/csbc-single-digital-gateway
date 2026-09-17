import { Input } from '@repo/ui/input';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import type { Criterion, Operator } from '../../types/elements';
import { needsValue, operatorsFor, OPERATOR_LABELS, type CriterionField } from './criteria';
import type { FlowEditor } from './flow-editor';

// A criterion row's pickers on the Condition card (doc 199 rules 25-26, 28), split out of `condition-renderer`.

// Doc 196 rule 13: under an editor the card is pointer-events-none (presses fall through to the studio frame),
// so the row controls opt back in, and `nodrag` stops xyflow starting a drag from them.
export const ROW_CONTROL_CLASS = 'nodrag pointer-events-auto';

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
export function CriterionControls({ criterion, fields, editor, conditionId }: RowProps) {
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
