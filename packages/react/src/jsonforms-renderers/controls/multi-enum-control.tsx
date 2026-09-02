import { and, hasType, rankWith, schemaMatches, uiTypeIs } from '@jsonforms/core';
import type {
  ControlProps,
  DispatchPropsOfMultiEnumControl,
  JsonSchema,
  OwnPropsOfEnum,
  RankedTester,
} from '@jsonforms/core';
import { withJsonFormsMultiEnumProps } from '@jsonforms/react';
import { Checkbox } from '@repo/ui/checkbox';
import { Field, FieldLabel } from '@repo/ui/field';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// An array whose items are a single enum/oneOf schema → a multi-select checkbox group.
const isEnumArray = (schema: JsonSchema): boolean => {
  const items = schema.items;
  if (!items || Array.isArray(items)) {
    return false;
  }
  const itemSchema = items as JsonSchema;
  return Boolean(itemSchema.enum) || Boolean(itemSchema.oneOf);
};

export const multiEnumControlTester: RankedTester = rankWith(
  5,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => hasType(schema, 'array') && isEnumArray(schema)),
  ),
);

function MultiEnumControlComponent({
  id,
  data,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
  options,
  addItem,
  removeItem,
}: ControlProps & OwnPropsOfEnum & DispatchPropsOfMultiEnumControl) {
  if (visible === false) {
    return null;
  }
  const selected: unknown[] = Array.isArray(data) ? data : [];

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
        aria-invalid={Boolean(errors)}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-describedby={describedByIds(id, { description, errors })}
        className="grid gap-3"
      >
        {options?.map((option) => {
          const itemId = `${id}-${String(option.value)}`;
          const checked = selected.includes(option.value);
          return (
            <Field key={String(option.value)} orientation="horizontal">
              <Checkbox
                id={itemId}
                checked={checked}
                disabled={enabled === false}
                onCheckedChange={(next) =>
                  next ? addItem(path, option.value) : removeItem?.(path, option.value)
                }
              />
              <FieldLabel htmlFor={itemId}>{option.label}</FieldLabel>
            </Field>
          );
        })}
      </div>
    </ControlWrapper>
  );
}

export const MultiEnumControl = withJsonFormsMultiEnumProps(MultiEnumControlComponent);
