import { Button } from '@repo/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '@repo/ui/combobox';
import type { ChoiceOption } from './model';

/**
 * The opt-in Combobox presentation for the `select` field type (feature 168) — a filterable
 * `@repo/ui` Combobox instead of the plain dropdown, with a multi-selection rendered as removable
 * chips. `choices` is a fresh array every render (`choicesFromSchema` recomputes it each call), so
 * item objects are never referentially stable — `isItemEqualToValue` compares by `.value` instead of
 * the default `Object.is`.
 */
const isSameChoice = (a: ChoiceOption, b: ChoiceOption): boolean => a.value === b.value;

/** Select, single value: opt-in filterable combobox with a Clear button. */
export function ChoiceComboboxSingle({
  id,
  choices,
  data,
  disabled,
  invalid,
  onPick,
}: {
  id: string;
  choices: ChoiceOption[];
  data: unknown;
  disabled: boolean;
  invalid: boolean;
  onPick: (value: string | undefined) => void;
}) {
  const value = choices.find((choice) => choice.value === data) ?? null;
  return (
    <Combobox
      items={choices}
      value={value}
      isItemEqualToValue={isSameChoice}
      disabled={disabled}
      autoHighlight
      onValueChange={(next) => onPick(next?.value ?? undefined)}
    >
      <ComboboxInput
        id={id}
        placeholder="Select…"
        aria-invalid={invalid}
        showClear
        clearLabel="Clear"
      />
      <ComboboxContent>
        <ComboboxEmpty>No options found.</ComboboxEmpty>
        <ComboboxList>
          {(choice: ChoiceOption) => (
            <ComboboxItem key={choice.value} value={choice}>
              {choice.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Select, multi value: opt-in filterable combobox rendering picks as removable chips. */
export function ChoiceComboboxMulti({
  id,
  choices,
  selected,
  disabled,
  invalid,
  onPick,
}: {
  id: string;
  choices: ChoiceOption[];
  selected: unknown[];
  disabled: boolean;
  invalid: boolean;
  onPick: (value: string[]) => void;
}) {
  const value = choices.filter((choice) => selected.includes(choice.value));
  // Chips wrap onto new lines as picks accumulate, moving the trailing input — anchor the popup to
  // the whole chips box (not the input caret) so it doesn't drift right as more chips are added.
  const anchor = useComboboxAnchor();
  return (
    <Combobox
      items={choices}
      multiple
      value={value}
      isItemEqualToValue={isSameChoice}
      disabled={disabled}
      autoHighlight
      onValueChange={(next) => onPick(next.map((choice) => choice.value))}
    >
      <ComboboxChips ref={anchor} className="group">
        <ComboboxValue>
          {(current: ChoiceOption[]) =>
            current.map((choice) => (
              <ComboboxChip key={choice.value} removeLabel={`Remove ${choice.label}`}>
                {choice.label}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          placeholder={value.length === 0 ? 'Select…' : ''}
          disabled={disabled}
          aria-invalid={invalid}
        />
        {/* Hidden whenever ComboboxClear mounts (it only mounts when there's something to clear —
            verified against Base UI directly) — one icon at a time, same as ComboboxInput's own
            trigger/clear swap. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          render={<ComboboxTrigger />}
          aria-label="Open"
          disabled={disabled}
          className="shrink-0 group-has-data-[slot=combobox-clear]:hidden"
        />
        <ComboboxClear aria-label="Clear all" />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No options found.</ComboboxEmpty>
        <ComboboxList>
          {(choice: ChoiceOption) => (
            <ComboboxItem key={choice.value} value={choice}>
              {choice.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
