import type { Clause, Operator } from '@repo/forms';
import { Input } from '@repo/ui/input';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import {
  clauseFor,
  needsValue,
  OPERATOR_LABELS,
  OPERATORS_BY_KIND,
  startingValue,
  takesList,
  type CriterionField,
} from './criteria';

/** One clause's pickers: field, operator (the field kind's), and a value control chosen by kind and operator. */
export function ClauseFields({
  clause,
  fields,
  onChange,
}: {
  clause: Clause;
  fields: readonly CriterionField[];
  onChange: (clause: Clause) => void;
}) {
  const field = fields.find((f) => f.key === clause.field);
  const operators = field === undefined ? [clause.operator] : OPERATORS_BY_KIND[field.kind];

  return (
    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
      <NativeSelect
        aria-label="Field"
        value={clause.field}
        onChange={(event) => {
          const next = fields.find((f) => f.key === event.target.value);
          if (next !== undefined) onChange(clauseFor(next, clause.id));
        }}
      >
        {field === undefined && (
          <NativeSelectOption value={clause.field}>
            {clause.field} (not upstream)
          </NativeSelectOption>
        )}
        {fields.map((f) => (
          <NativeSelectOption key={f.key} value={f.key}>
            {f.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Operator"
        value={clause.operator}
        onChange={(event) => onChange(withOperator(clause, event.target.value as Operator, field))}
      >
        {operators.map((op) => (
          <NativeSelectOption key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {field !== undefined && needsValue(clause.operator) ? (
        <ValueControl clause={clause} field={field} onChange={onChange} />
      ) : (
        <span />
      )}
    </div>
  );
}

function ValueControl({
  clause,
  field,
  onChange,
}: {
  clause: Clause;
  field: CriterionField;
  onChange: (clause: Clause) => void;
}) {
  const set = (value: Clause['value']) => onChange(withValue(clause, value));
  if (field.kind === 'choice' && takesList(clause.operator)) {
    const chosen = Array.isArray(clause.value) ? clause.value : [];
    return (
      <fieldset aria-label="Values" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {(field.options ?? []).map((option) => (
          <label key={String(option.value)} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={chosen.includes(option.value)}
              onChange={(event) =>
                set(
                  event.target.checked
                    ? [...chosen, option.value]
                    : chosen.filter((v) => v !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }
  // A multiple choice's includes / does not include test ONE option (doc 256 rule 4), picked like a single choice's.
  if (field.kind === 'choice' || field.kind === 'multi') {
    return (
      <NativeSelect
        aria-label="Value"
        value={String(clause.value ?? '')}
        onChange={(event) =>
          set(field.options?.find((o) => String(o.value) === event.target.value)?.value)
        }
      >
        {(field.options ?? []).map((option) => (
          <NativeSelectOption key={String(option.value)} value={String(option.value)}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  }
  return (
    <Input
      aria-label="Value"
      className="h-7 text-xs"
      type={field.kind === 'number' ? 'number' : 'text'}
      value={clause.value === undefined ? '' : String(clause.value)}
      onChange={(event) => set(parsed(field, event.target.value))}
    />
  );
}

/** A number field's typed text as a number (absent while blank or invalid); any other field's text as is. */
function parsed(field: CriterionField, text: string): Clause['value'] {
  if (field.kind !== 'number') return text;
  const value = Number(text);
  return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
}

/** A clause with a new operator, keeping its value when it still fits (same list-ness, still needed). */
function withOperator(
  clause: Clause,
  operator: Operator,
  field: CriterionField | undefined,
): Clause {
  const fits =
    needsValue(operator) &&
    needsValue(clause.operator) &&
    takesList(operator) === takesList(clause.operator);
  const value = fits
    ? clause.value
    : field === undefined
      ? undefined
      : startingValue(field, operator);
  return withValue({ ...clause, operator }, value);
}

/** A clause with `value` set, or with NO `value` key when it is `undefined` (`exactOptionalPropertyTypes`). */
function withValue(clause: Clause, value: Clause['value']): Clause {
  const { value: _previous, ...rest } = clause;
  return value === undefined ? rest : { ...rest, value };
}
