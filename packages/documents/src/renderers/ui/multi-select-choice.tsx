import { Button } from '@repo/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '@repo/ui/combobox';
import type { ChoiceOption } from './choice-options';
import type { MultiChoiceControlSlot } from './multi-choice-control';

// Options are rebuilt from the schema, so items are matched by value, never identity (doc 244 rule 5).
const isSameOption = (item: ChoiceOption, value: ChoiceOption) => item.value === value.value;
const optionLabel = (option: ChoiceOption) => option.label;

/**
 * The Multi-select (doc 245 rules 9-11): a `multiple` Combobox with one removable chip per pick, items filtered by
 * label with any description as a muted second line, and Clear all only when the field is optional. The popup is
 * anchored to the whole chips box, which wraps as picks accumulate, so it doesn't drift with the input.
 */
export function MultiSelectChoice({
  id,
  options,
  chosen,
  disabled,
  required,
  onValuesChange,
  labelId: _labelId,
  ...aria
}: MultiChoiceControlSlot) {
  const anchor = useComboboxAnchor();
  return (
    <Combobox
      items={options}
      multiple
      value={chosen}
      isItemEqualToValue={isSameOption}
      itemToStringLabel={optionLabel}
      autoHighlight
      disabled={disabled}
      onValueChange={(next: ChoiceOption[]) => onValuesChange(next.map((option) => option.value))}
    >
      <ComboboxChips ref={anchor} className="group">
        <ComboboxValue>
          {(current: ChoiceOption[]) =>
            current.map((option) => (
              <ComboboxChip key={option.value} removeLabel={`Remove ${option.label}`}>
                {option.label}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput id={id} disabled={disabled} {...aria} />
        {/* Hidden while Clear all is mounted (only when there is something to clear), so one icon shows. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          render={<ComboboxTrigger />}
          aria-label="Open"
          disabled={disabled}
          className="shrink-0 group-has-data-[slot=combobox-clear]:hidden"
        />
        {!required && <ComboboxClear aria-label="Clear all" />}
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No options found.</ComboboxEmpty>
        <ComboboxList>
          {(option: ChoiceOption) => (
            <ComboboxItem key={option.value} value={option}>
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
