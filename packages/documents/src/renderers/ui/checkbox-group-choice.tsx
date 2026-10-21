import { Checkbox } from '@repo/ui/checkbox';
import { CheckboxGroup } from '@repo/ui/checkbox-group';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { ChoiceOption } from './choice-options';
import type { MultiChoiceControlSlot } from './multi-choice-control';

/** Base UI's CheckboxGroup value is `string[]`, so a numeric const is keyed by its string here (doc 246 rule 7). */
const keyOf = (option: ChoiceOption) => String(option.value);

/**
 * The Checkbox group (doc 245 rules 12-13): a `role="group"` named by the control label through `aria-labelledby`,
 * one row per option — its box, then its title (which toggles it) and any description — doc 244 rule 16's row.
 */
export function CheckboxGroupChoice({
  id,
  options,
  chosen,
  disabled,
  required: _required,
  onValuesChange,
  labelId,
  ...aria
}: MultiChoiceControlSlot) {
  return (
    <CheckboxGroup
      id={id}
      {...aria}
      {...(labelId !== undefined && { 'aria-labelledby': labelId })}
      value={chosen.map(keyOf)}
      disabled={disabled}
      // Mapped back to the options' own values, so a numeric choice never writes a string.
      onValueChange={(next: string[]) =>
        onValuesChange(options.filter((o) => next.includes(keyOf(o))).map((o) => o.value))
      }
    >
      {options.map((option, index) => {
        const itemId = `${id}-option-${index}`;
        const descriptionId = `${itemId}-description`;
        return (
          <Field key={keyOf(option)} orientation="horizontal">
            <Checkbox
              id={itemId}
              value={keyOf(option)}
              {...(option.description !== undefined && { 'aria-describedby': descriptionId })}
            />
            <FieldContent>
              <FieldLabel htmlFor={itemId}>{option.label}</FieldLabel>
              {option.description !== undefined && (
                <FieldDescription id={descriptionId}>{option.description}</FieldDescription>
              )}
            </FieldContent>
          </Field>
        );
      })}
    </CheckboxGroup>
  );
}
