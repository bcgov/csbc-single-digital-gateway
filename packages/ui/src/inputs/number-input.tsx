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
    /**
     * Sits inside an `InputGroup` (doc 286): the input drops its own border and background and takes the group's
     * control slot, so the group draws the focus and invalid rings around input and addons together.
     */
    grouped?: boolean | undefined;
    /**
     * Refuses an edit that would leave more than this many digits after the decimal separator (doc 286). Base UI
     * rounds only on blur and reports the raw value on every keystroke, so a format's `maximumFractionDigits` alone
     * lets `5.678` be shown and written while typing.
     */
    maxFractionDigits?: number | undefined;
  };

/** The digits after `locale`'s decimal separator in `text` — `0` when it has none. */
function fractionDigits(text: string, locale: Intl.LocalesArgument): number {
  const decimal =
    new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')
      ?.value ?? '.';
  const at = text.lastIndexOf(decimal);
  return at === -1 ? 0 : (text.slice(at + decimal.length).match(/\d/g)?.length ?? 0);
}

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
  grouped = false,
  maxFractionDigits,
  ...props
}: NumberInputProps) {
  return (
    <NumberField.Root
      data-slot="number-input"
      {...(grouped && { className: 'min-w-0 flex-1' })}
      {...props}
    >
      <NumberField.Input
        data-slot={grouped ? 'input-group-control' : 'number-input-input'}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        onChange={(event) => {
          // Skipping Base UI's handler leaves its text state unchanged, so React restores the previous text.
          if (
            maxFractionDigits !== undefined &&
            fractionDigits(event.currentTarget.value, props.locale) > maxFractionDigits
          )
            event.preventBaseUIHandler();
        }}
        className={cn(
          'w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:caret-transparent read-only:select-none read-only:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          grouped &&
            'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent read-only:bg-transparent dark:read-only:bg-transparent',
          className,
        )}
      />
    </NumberField.Root>
  );
}

export { NumberInput, type NumberInputProps };
