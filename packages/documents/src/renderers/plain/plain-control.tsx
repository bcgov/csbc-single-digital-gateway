import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldDescription, FieldTitle } from '@repo/ui/field';
import { RichTextView } from '@repo/ui/rich-text-view';
import { controlDescription } from '../ui/control-description';
import { isObjectArray } from '../ui/object-array';
import { plainValue, type PlainValue } from './plain-value';

/** Doc 282 rule 6: the one wording for a blank answer — only the field writes it. */
export const NOT_ANSWERED = 'Not answered';

/**
 * Every Control that is not an object array, above every fill control (doc 282 rule 5): an object array keeps its own
 * disabled read-back (rules 8-10).
 */
export const plainControlTester = rankWith(
  10,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => !isObjectArray(schema)),
  ),
);

/**
 * One answer read back (doc 282 rules 5-7): its label — NOT a `<label>`, no required marker — its value, then its
 * description. Always drawn while visible, so a blank answer is told apart from a question never asked.
 */
export function PlainField({
  label,
  value,
  description,
}: {
  label: string;
  value: PlainValue | undefined;
  description?: string | undefined;
}) {
  return (
    <Field data-slot="plain-field">
      {label !== '' && (
        <FieldTitle data-slot="plain-field-label" className="text-sm">
          {label}
        </FieldTitle>
      )}
      <div
        data-slot="plain-field-value"
        data-empty={value === undefined ? '' : undefined}
        className={
          value === undefined
            ? 'text-sm text-muted-foreground italic'
            : 'text-sm whitespace-pre-line'
        }
      >
        <PlainBody value={value} />
      </div>
      {description !== undefined && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function PlainBody({ value }: { value: PlainValue | undefined }) {
  if (value === undefined) return NOT_ANSWERED;
  if (value.kind === 'rich') return <RichTextView value={value.state} />;
  if (value.kind === 'list')
    return (
      // A `div` holds the value, never a `p`: a list cannot sit inside a paragraph.
      <ul data-slot="plain-field-list" className="list-inside list-disc">
        {value.items.map((item, index) => (
          <li key={index} className="text-[length:inherit]">
            {item}
          </li>
        ))}
      </ul>
    );
  return value.text;
}

export function PlainControl({ data, schema, uischema, label, visible }: ControlProps) {
  if (!visible) return null;
  return (
    <PlainField
      label={label}
      value={plainValue(schema, uischema, data)}
      description={controlDescription(uischema, schema)}
    />
  );
}

export const plainControlEntry = {
  tester: plainControlTester,
  renderer: withJsonFormsControlProps(PlainControl),
};
