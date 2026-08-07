import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { ControlWrapper } from '../../util/control-wrapper';
import { labelForValue, readChoiceOptions } from './model';

/**
 * The unified choice control (feature 156, Step 2). Dispatched purely by `options.format: 'choice'`,
 * ranked above the generic enum/oneOf/multi-enum renderers so it owns every builder-authored choice
 * field. Presentation comes from `options.display` (+ `options.multiple` for `select`); the visible
 * labels come from `options.choices` — the schema only carries the values (for Ajv).
 */
export const choiceControlTester: RankedTester = rankWith(
  6,
  and(uiTypeIs('Control'), optionIs('format', 'choice')),
);

function ChoiceControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
  uischema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const { display, multiple, choices } = readChoiceOptions(uischema.options);
  const disabled = enabled === false;
  const invalid = Boolean(errors);
  const selected: unknown[] = Array.isArray(data) ? data : [];

  if (display === 'radio') {
    return (
      <ControlWrapper
        id={id}
        label={label}
        required={required}
        {...(description ? { description } : {})}
        errors={errors}
        labelFor={false}
      >
        <RadioGroup
          value={(data as string | null | undefined) ?? null}
          disabled={disabled}
          aria-invalid={invalid}
          onValueChange={(value: unknown) => handleChange(path, value ?? undefined)}
        >
          {choices.map((choice) => {
            const itemId = `${id}-${choice.value}`;
            return (
              <Field key={choice.value} orientation="horizontal">
                <RadioGroupItem id={itemId} value={choice.value} />
                <FieldLabel htmlFor={itemId}>{choice.label}</FieldLabel>
              </Field>
            );
          })}
        </RadioGroup>
      </ControlWrapper>
    );
  }

  if (display === 'checkboxes') {
    const toggle = (value: string, next: boolean) => {
      const without = selected.filter((entry) => entry !== value);
      handleChange(path, next ? [...without, value] : without);
    };
    return (
      <ControlWrapper
        id={id}
        label={label}
        required={required}
        {...(description ? { description } : {})}
        errors={errors}
        labelFor={false}
      >
        <div data-slot="checkbox-group" className="grid gap-3" aria-invalid={invalid}>
          {choices.map((choice) => {
            const itemId = `${id}-${choice.value}`;
            return (
              <Field key={choice.value} orientation="horizontal">
                <Checkbox
                  id={itemId}
                  checked={selected.includes(choice.value)}
                  disabled={disabled}
                  onCheckedChange={(next) => toggle(choice.value, next === true)}
                />
                <FieldLabel htmlFor={itemId}>{choice.label}</FieldLabel>
              </Field>
            );
          })}
        </div>
      </ControlWrapper>
    );
  }

  // display === 'select' — a single or multi Base UI (@repo/ui) dropdown. The value is rendered as the
  // authored label(s); `multiple` is passed as a literal in each branch so its generic type resolves.
  const valueDisplay = (
    <SelectValue placeholder="Select…">
      {(current: unknown) => {
        const list = Array.isArray(current)
          ? current
          : current === undefined || current === null || current === ''
            ? []
            : [current];
        return list.length === 0
          ? 'Select…'
          : list.map((v) => labelForValue(choices, v)).join(', ');
      }}
    </SelectValue>
  );
  const items = choices.map((choice) => (
    <SelectItem key={choice.value} value={choice.value}>
      {choice.label}
    </SelectItem>
  ));
  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      {multiple ? (
        <Select
          multiple
          value={selected as string[]}
          disabled={disabled}
          onValueChange={(next: string[]) => handleChange(path, next)}
        >
          <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
            {valueDisplay}
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
      ) : (
        <Select
          value={(data as string | undefined) ?? null}
          disabled={disabled}
          onValueChange={(next: string | null) => handleChange(path, next ?? undefined)}
        >
          <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
            {valueDisplay}
          </SelectTrigger>
          <SelectContent>{items}</SelectContent>
        </Select>
      )}
    </ControlWrapper>
  );
}

export const ChoiceControl = withJsonFormsControlProps(ChoiceControlComponent);
