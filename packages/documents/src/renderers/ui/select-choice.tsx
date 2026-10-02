import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import type { ChoiceOption } from './choice-options';
import type { ChoiceControlSlot } from './single-choice-control';

// Options are rebuilt from the schema, so items are matched by value, never identity (doc 244 rule 5).
const isSameOption = (item: ChoiceOption, value: ChoiceOption) => item.value === value.value;
const optionLabel = (option: ChoiceOption) => option.label;

/**
 * The Select (doc 244 rules 12-14): a Combobox filtered by option label, each item's description as a muted second
 * line, and a clear button only when the field is optional.
 */
export function SelectChoice({
  id,
  options,
  selected,
  disabled,
  required,
  onValueChange,
  labelId: _labelId,
  ...aria
}: ChoiceControlSlot) {
  return (
    <Combobox
      items={options}
      value={selected}
      isItemEqualToValue={isSameOption}
      itemToStringLabel={optionLabel}
      autoHighlight
      disabled={disabled}
      onValueChange={(next) => onValueChange(next?.value)}
    >
      <ComboboxInput
        id={id}
        disabled={disabled}
        {...aria}
        showClear={!required}
        {...(!required && { clearLabel: 'Clear' })}
      />
      <ComboboxContent>
        <ComboboxEmpty>No options found.</ComboboxEmpty>
        <ComboboxList>
          {(option: ChoiceOption) => (
            <ComboboxItem key={String(option.value)} value={option}>
              <span className="flex flex-col">
                <span>{option.label}</span>
                {option.description !== undefined && (
                  <span
                    data-slot="choice-option-description"
                    className="text-xs text-muted-foreground"
                  >
                    {option.description}
                  </span>
                )}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
