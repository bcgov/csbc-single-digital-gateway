import { isStringControl, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ComponentProps } from 'react';
import { Input } from '@repo/ui/input';
import { Textarea } from '@repo/ui/textarea';
import { useMaskInput } from 'use-mask-input';
import { ClearableInput } from '../util/clearable-input';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// The lowest-ranked string renderer — wins for any plain string with no more specific tester (enum,
// date, richtext, choice, etc.). Feature 158: this ONE control serves both single-line (`<Input>`) and
// multiline (`<Textarea>` when `options.multi`) text, plus placeholder / maxLength; single-line inputs
// can also carry an input `mask` (feature 158, use-mask-input) — masks don't apply to multiline.
export const textControlTester: RankedTester = rankWith(1, isStringControl);

interface TextOptions {
  multi?: boolean;
  placeholder?: string;
  mask?: string;
}

/**
 * A single-line `<Input>` with an inputmask applied via `use-mask-input`. Its own component so the
 * `useMaskInput` hook is called unconditionally (mount it only when a mask is authored); the returned
 * ref callback attaches to the DOM input (Base UI's Input forwards the ref in React 19).
 */
function MaskedTextInput({ mask, ...props }: { mask: string } & ComponentProps<'input'>) {
  const maskRef = useMaskInput({ mask });
  return <Input ref={maskRef} {...props} />;
}

function TextControlComponent({
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
  const options = (uischema.options ?? {}) as TextOptions;
  const rawMax = (schema as { maxLength?: unknown }).maxLength;
  const maxLength = typeof rawMax === 'number' ? rawMax : undefined;
  const value = (data as string | undefined) ?? '';
  const disabled = enabled === false;
  const invalid = Boolean(errors);
  const commit = (next: string) => handleChange(path, next === '' ? undefined : next);
  const onChange = (event: { target: { value: string } }) => commit(event.target.value);

  const shared = {
    id,
    value,
    disabled,
    'aria-invalid': invalid,
    'aria-describedby': describedByIds(id, { description, errors }),
    ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    ...(maxLength !== undefined ? { maxLength } : {}),
  };

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      {options.multi === true ? (
        // ~5 rows tall by default, then auto-grows with content. The @repo/ui Textarea already sets
        // `field-sizing-content` (grow); we only raise its `min-h-16` floor to roughly five rows.
        <Textarea {...shared} className="min-h-[7.5rem]" onChange={onChange} />
      ) : options.mask ? (
        <MaskedTextInput mask={options.mask} {...shared} onChange={onChange} />
      ) : (
        <ClearableInput {...shared} onChange={onChange} onClear={() => commit('')} />
      )}
      {maxLength !== undefined ? (
        <div className="text-right text-xs text-muted-foreground tabular-nums">
          {value.length}/{maxLength}
        </div>
      ) : null}
    </ControlWrapper>
  );
}

export const TextControl = withJsonFormsControlProps(TextControlComponent);
