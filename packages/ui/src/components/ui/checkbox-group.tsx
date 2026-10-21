import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';

import { cn } from '@ui/lib/utils';

/**
 * A set of related checkboxes sharing one `string[]` value — Base UI's CheckboxGroup with this system's
 * spacing, the `data-slot` `field.tsx` already styles, and the group semantics a checkbox set needs.
 *
 * It exists as a component rather than as something each caller composes because the a11y catalogue recorded
 * the gap: with no CheckboxGroup, the two renderers that built one disagreed about the wiring and one of them
 * got it wrong. `role="group"` + a name + `aria-invalid` belong to the group, once.
 *
 * Items are `Checkbox` with a `value` identifying each within the group (Base UI falls back to `name`).
 * Base UI's value is `string[]`, so a caller holding non-string values converts at its own boundary.
 */
function CheckboxGroup({
  className,
  invalid,
  ...props
}: CheckboxGroupPrimitive.Props & {
  /**
   * Marks the whole group invalid. Explicit because it must be: a checkbox group's invalid signal is not
   * inferred from its items, and the individual boxes never show destructive styling of their own — so an
   * unwired group reads as perfectly fine to a screen reader while red error text sits beneath it.
   */
  invalid?: boolean | undefined;
}) {
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      // Base UI renders a plain div: without this the set has no group semantics, and a screen reader user
      // tabbing in hears each checkbox in isolation with no sense they belong together.
      role="group"
      {...(invalid ? { 'aria-invalid': true as const } : {})}
      className={cn('grid w-full gap-3', className)}
      {...props}
    />
  );
}

export { CheckboxGroup };
