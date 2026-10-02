import { Field, FieldContent, FieldDescription, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import type { ChoiceControlSlot } from './single-choice-control';

/**
 * The Radio group (doc 244 rules 15-16): named by the control label through `aria-labelledby` (a group is not
 * labelable), one row per option — its radio, then its title (which selects it) and any description.
 */
export function RadioGroupChoice({
  id,
  options,
  selected,
  disabled,
  required: _required,
  onValueChange,
  labelId,
  ...aria
}: ChoiceControlSlot) {
  return (
    <RadioGroup
      id={id}
      {...aria}
      {...(labelId !== undefined && { 'aria-labelledby': labelId })}
      value={selected?.value ?? null}
      disabled={disabled}
      onValueChange={(value) => onValueChange(value as string)}
    >
      {options.map((option, index) => {
        const itemId = `${id}-option-${index}`;
        const descriptionId = `${itemId}-description`;
        return (
          <Field key={option.value} orientation="horizontal">
            <RadioGroupItem
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
    </RadioGroup>
  );
}
