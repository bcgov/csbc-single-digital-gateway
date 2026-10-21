import { rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
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
import { useMemo } from 'react';
import type { ChoiceOption } from './choice-control';
import { ControlField } from './control-field';
import { PlainList } from './control-plain-field';
import { plainMultiChoice } from './control-plain-value';
import { choiceInputProps } from './control-options';
import {
  chosenOptions,
  isMultiChoiceControl,
  multiChoiceOptions,
  storedChoices,
} from './multi-choice-control';

/**
 * Any multi-choice control — `options.component` absent, `'combobox'` or unrecognised (doc 205 rule 5).
 *
 * Rank 5, not 3: nothing ties today because `isChoiceControl` cannot match an array, but reusing the
 * single-choice ranks would make the sets tie the moment either predicate widened (rule 7).
 */
export const multiComboboxTester: RankedTester = rankWith(5, isMultiChoiceControl);

// `multiChoiceOptions` builds fresh option objects every render, so items are matched by value, never by
// identity — without this the combobox silently shows nothing selected (doc 205 rule 13).
const isSameOption = (item: ChoiceOption, value: ChoiceOption) => item.value === value.value;
const optionLabel = (option: ChoiceOption) => option.label;

/**
 * Renders a multi-choice `Control` as a `@repo/ui` `Combobox` in `multiple` mode, one removable chip per
 * selection (doc 205 rules 12-17). Picking writes the chosen consts in AUTHORING order; clearing writes
 * `undefined`, never `[]`, so a plain `required` still fails (rules 8-9).
 */
function MultiComboboxControl(props: ControlProps) {
  const { data, path, schema, uischema, enabled, handleChange } = props;
  const options = useMemo(() => multiChoiceOptions(schema) ?? [], [schema]);
  const value = chosenOptions(options, data);
  // Chips wrap onto new lines as picks accumulate, moving the trailing input — anchor the popup to the whole
  // chips box, not the input caret, or it drifts right as more chips are added (doc 205 rule 14).
  const anchor = useComboboxAnchor();
  const { placeholder } = choiceInputProps(uischema.options);

  return (
    // Doc 202 rule 50: a Combobox has no HTML read-only, so read-only falls back to disabled.
    // Doc 211 rule 11: the chosen labels as a list, in authoring order.
    <ControlField control={props} noReadOnly plainValue={PlainList(plainMultiChoice(schema, data))}>
      {(input) => (
        <Combobox
          items={options}
          multiple
          value={value}
          isItemEqualToValue={isSameOption}
          itemToStringLabel={optionLabel}
          autoHighlight
          disabled={!enabled}
          onValueChange={(next: ChoiceOption[]) => handleChange(path, storedChoices(options, next))}
        >
          <ComboboxChips ref={anchor} className="group">
            <ComboboxValue>
              {(current: ChoiceOption[]) =>
                current.map((option) => (
                  <ComboboxChip key={String(option.value)} removeLabel={`Remove ${option.label}`}>
                    {option.label}
                  </ComboboxChip>
                ))
              }
            </ComboboxValue>
            <ComboboxChipsInput
              {...input}
              // Rule 17: the placeholder is for an EMPTY field — beside chips it would read as another chip.
              {...(placeholder !== undefined && value.length === 0 ? { placeholder } : {})}
            />
            {/* Hidden whenever ComboboxClear mounts (it mounts only when there is something to clear), so one
                icon shows at a time — the same trigger/clear swap ComboboxInput does for itself. */}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              render={<ComboboxTrigger />}
              aria-label="Open"
              disabled={!enabled}
              className="shrink-0 group-has-data-[slot=combobox-clear]:hidden"
            />
            <ComboboxClear aria-label="Clear all" />
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>No options found.</ComboboxEmpty>
            {/* Rule 15: the FUNCTION child form — `.map()` here breaks filtering (a11y catalogue). */}
            <ComboboxList>
              {(option: ChoiceOption) => (
                <ComboboxItem key={String(option.value)} value={option}>
                  <span className="flex flex-col gap-0.5">
                    <span>{option.label}</span>
                    {/* Rule 16: an option's own help text, under its label. */}
                    {option.description === undefined ? null : (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </ControlField>
  );
}

export const MultiComboboxControlRenderer = withJsonFormsControlProps(MultiComboboxControl);
