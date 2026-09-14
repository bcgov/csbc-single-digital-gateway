import {
  computeLabel,
  isBooleanControl,
  rankWith,
  type ControlProps,
  type RankedTester,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@repo/ui/field';
import { Switch } from '@repo/ui/switch';

/** Any `type: 'boolean'` control (doc 187 rule 4). */
export const switchTester: RankedTester = rankWith(1, isBooleanControl);

/**
 * Renders a boolean `Control` as a horizontal `@repo/ui` `Field`: the label and schema description on the
 * left, a `Switch` on the right. `checked` is `data === true`; toggling writes `true` / `false`. The switch is
 * named by its label (`aria-labelledby` as well as the label's `htmlFor`) and described by whichever
 * description and error rendered, like `ControlField`.
 */
function SwitchControl(props: ControlProps) {
  const { id, data, path, label, required, description, errors, enabled, visible, config } = props;
  if (!visible) return null;

  const inputId = `${id}-input`;
  const labelId = label.trim() ? `${inputId}-label` : undefined;
  const descriptionId = description?.trim() ? `${inputId}-description` : undefined;
  const errorId = errors ? `${inputId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ');
  const hideRequiredAsterisk = config?.hideRequiredAsterisk === true;

  return (
    <Field orientation="horizontal" data-disabled={enabled ? undefined : true}>
      <FieldContent>
        {labelId ? (
          <FieldLabel id={labelId} htmlFor={inputId}>
            {computeLabel(label, required === true, hideRequiredAsterisk)}
          </FieldLabel>
        ) : null}
        {descriptionId ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
        {errorId ? <FieldError id={errorId}>{errors}</FieldError> : null}
      </FieldContent>
      <Switch
        size="sm"
        id={inputId}
        checked={data === true}
        disabled={!enabled}
        onCheckedChange={(checked) => props.handleChange(path, checked)}
        {...(labelId ? { 'aria-labelledby': labelId } : {})}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        {...(errorId ? { 'aria-invalid': true } : {})}
      />
    </Field>
  );
}

export const SwitchControlRenderer = withJsonFormsControlProps(SwitchControl);
