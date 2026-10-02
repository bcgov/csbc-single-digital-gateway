import { Checkbox } from '@repo/ui/checkbox';
import { CheckboxGroup } from '@repo/ui/checkbox-group';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@repo/ui/field';
import type { MultiChoiceControlSlot } from './multi-choice-control';

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
      value={chosen.map((option) => option.value)}
      disabled={disabled}
      onValueChange={(next: string[]) => onValuesChange(next)}
    >
      {options.map((option, index) => {
        const itemId = `${id}-option-${index}`;
        const descriptionId = `${itemId}-description`;
        return (
          <Field key={option.value} orientation="horizontal">
            <Checkbox
              id={itemId}
              value={option.value}
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
