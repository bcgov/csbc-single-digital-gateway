import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldDescription, FieldLabel } from '@repo/ui/field';
import { RichTextInput } from '@repo/ui/rich-text-input';
import { controlDescription } from './control-description';
import { isRichTextProperty, richTextHasText, richTextValue } from './rich-text-value';

/** A Control over a rich text property (doc 250 rules 1, 5) — disjoint from every other control by `type`. */
export const richTextControlTester = rankWith(
  1,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isRichTextProperty(schema)),
  ),
);

/**
 * A rich text field (rules 5-6): label (with a required marker), description, then the editor — a `div`, so it is named
 * by the label's id rather than `for`. A change holding no text writes `undefined`, so `required` fails as elsewhere.
 */
export function RichTextControl(props: ControlProps) {
  const { data, handleChange, path, id, label, required, uischema, schema, enabled, visible } =
    props;
  if (!visible) return null;
  const description = controlDescription(uischema, schema);
  const descriptionId = `${id}-description`;
  const labelId = `${id}-label`;
  const placeholder = uischema.options?.['placeholder'];
  return (
    <Field data-slot="rich-text-field">
      {label !== '' && (
        <FieldLabel id={labelId}>
          {label}
          {required === true && <span aria-hidden="true"> *</span>}
        </FieldLabel>
      )}
      {description !== undefined && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      <RichTextInput
        id={id}
        value={richTextValue(data) ?? null}
        disabled={!enabled}
        onChange={(state) => handleChange(path, richTextHasText(state) ? state : undefined)}
        {...(label === ''
          ? { 'aria-label': path.split('.').at(-1) ?? path }
          : { 'aria-labelledby': labelId })}
        {...(description !== undefined && { 'aria-describedby': descriptionId })}
        {...(typeof placeholder === 'string' && placeholder.trim() !== '' && { placeholder })}
      />
    </Field>
  );
}

export const richTextControlEntry = {
  tester: richTextControlTester,
  renderer: withJsonFormsControlProps(RichTextControl),
};
