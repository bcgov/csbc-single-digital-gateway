import { and, rankWith, schemaMatches, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import {
  Select,
  SelectClear,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';
import { ControlWrapper, describedByIds } from '../../util/control-wrapper';
import { ChoiceComboboxMulti, ChoiceComboboxSingle } from './choice-combobox';
import { isChoiceSchema, labelForValue, readChoiceOptions } from './model';

/**
 * The unified choice control (feature 156, Step 2; schema-shape dispatch since feature 167).
 * Dispatched by schema shape — a `oneOf` of `{ const, title }` (single) or an array of such (multi) —
 * ranked above the generic enum/oneOf/multi-enum renderers so it owns every choice-shaped schema, with
 * no `options` required (a bare `{ type: 'Control', scope }` uischema defaults to a `select`).
 * Presentation comes from `options.display`; the visible labels come from the schema's `oneOf`.
 */
export const choiceControlTester: RankedTester = rankWith(
  6,
  and(uiTypeIs('Control'), schemaMatches(isChoiceSchema)),
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
  schema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const { display, multiple, combobox, choices } = readChoiceOptions(uischema.options, schema);
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
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-describedby={describedByIds(id, { description, errors })}
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
        <div
          data-slot="checkbox-group"
          role="group"
          aria-invalid={invalid}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-describedby={describedByIds(id, { description, errors })}
          className="grid gap-3"
        >
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

  // display === 'select', combobox === true (feature 168, opt-in): a filterable Combobox instead of the
  // plain dropdown — chips for multi, a Clear button for single.
  if (combobox) {
    return (
      <ControlWrapper
        id={id}
        label={label}
        required={required}
        {...(description ? { description } : {})}
        errors={errors}
      >
        {multiple ? (
          <ChoiceComboboxMulti
            id={id}
            choices={choices}
            selected={selected}
            disabled={disabled}
            invalid={invalid}
            onPick={(next) => handleChange(path, next)}
          />
        ) : (
          <ChoiceComboboxSingle
            id={id}
            choices={choices}
            data={data}
            disabled={disabled}
            invalid={invalid}
            onPick={(next) => handleChange(path, next)}
          />
        )}
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
          <div className="group relative">
            <SelectTrigger
              id={id}
              aria-invalid={invalid}
              aria-describedby={describedByIds(id, { description, errors })}
              className="w-full"
            >
              {valueDisplay}
            </SelectTrigger>
            {selected.length > 0 && (
              <SelectClear
                aria-label="Clear all"
                disabled={disabled}
                onClick={() => handleChange(path, [])}
              />
            )}
          </div>
          <SelectContent>{items}</SelectContent>
        </Select>
      ) : (
        <Select
          value={(data as string | undefined) ?? null}
          disabled={disabled}
          onValueChange={(next: string | null) => handleChange(path, next ?? undefined)}
        >
          <div className="group relative">
            <SelectTrigger
              id={id}
              aria-invalid={invalid}
              aria-describedby={describedByIds(id, { description, errors })}
              className="w-full"
            >
              {valueDisplay}
            </SelectTrigger>
            {data !== undefined && data !== null && data !== '' && (
              <SelectClear
                aria-label="Clear"
                disabled={disabled}
                onClick={() => handleChange(path, undefined)}
              />
            )}
          </div>
          <SelectContent>{items}</SelectContent>
        </Select>
      )}
    </ControlWrapper>
  );
}

export const ChoiceControl = withJsonFormsControlProps(ChoiceControlComponent);
