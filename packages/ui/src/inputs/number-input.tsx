import * as React from 'react';
import { NumberField } from '@base-ui/react/number-field';

import { cn } from '@ui/lib/utils';

/** The props that belong on the native `<input>` rather than on `NumberField.Root`. */
type NumberInputElementProps = Pick<
  React.ComponentProps<'input'>,
  | 'placeholder'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-invalid'
  | 'aria-required'
>;

type NumberInputProps = Omit<NumberField.Root.Props, 'className'> &
  NumberInputElementProps & {
    className?: string | undefined;
  };

/**
 * A number input on Base UI's NumberField, taking one flat prop list like `Input` (doc 182).
 *
 * `className`, `placeholder` and the `aria-*` props go to the `<input>`, so it styles and is named
 * exactly like `Input`; every other prop (`value`, `onValueChange`, `min`, `max`, `step`, `format`,
 * `locale`, `id`, `disabled`, …) configures `NumberField.Root`, which forwards `id` to the `<input>`.
 * Input only — no increment/decrement buttons; the arrow keys still step.
 */
function NumberInput({
  className,
  placeholder,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: NumberInputProps) {
  return (
    <NumberField.Root data-slot="number-input" {...props}>
      <NumberField.Input
        data-slot="number-input-input"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        className={cn(
          'w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:caret-transparent read-only:select-none read-only:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          className,
        )}
      />
    </NumberField.Root>
  );
}

export { NumberInput, type NumberInputProps };
