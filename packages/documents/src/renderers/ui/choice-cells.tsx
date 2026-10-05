import { useId } from 'react';
import { chosenOptions, storedChoices, type ChoiceOption } from './choice-options';
import { MultiSelectChoice } from './multi-select-choice';
import { SelectChoice } from './select-choice';

/**
 * Sizes the field's Select input to a cell — the text cells' `h-8 text-xs` — from the wrapper, since the Combobox draws
 * its own input. The descendant selector outranks the input's own `text-base` class. (The chips box is already xs.)
 */
const CELL_SIZE =
  '[&_[data-slot=input-group-control]]:h-8 [&_[data-slot=input-group-control]]:py-1 [&_[data-slot=input-group-control]]:text-xs';

/**
 * A Select cell (doc 268 rule 3): the field's own clearable Combobox. A cleared cell writes `undefined`, which
 * removes the row's key.
 */
export function SelectCell({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChoiceOption[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  return (
    <div data-slot="choice-cell" className={`min-w-40 ${CELL_SIZE}`}>
      <SelectChoice
        id={id}
        aria-label={label}
        disabled={false}
        required={false}
        options={options}
        selected={options.find((option) => option.value === value) ?? null}
        onValueChange={onChange}
      />
    </div>
  );
}

/**
 * A Multi-select cell (doc 268 rule 3): the field's chips Combobox, writing the picks in AUTHORING order, or
 * `undefined` for none (doc 245 rule 6).
 */
export function MultiSelectCell({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChoiceOption[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  return (
    <div data-slot="choice-cell" className="min-w-48">
      <MultiSelectChoice
        id={id}
        aria-label={label}
        disabled={false}
        required={false}
        options={options}
        chosen={chosenOptions(options, value)}
        onValuesChange={(values) => onChange(storedChoices(options, values))}
      />
    </div>
  );
}
