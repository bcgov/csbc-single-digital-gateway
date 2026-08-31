'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';

import { cn } from '@ui/lib/utils';
import { mdiCheck } from '@mdi/js';
import { Icon } from '@mdi/react';

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4.5 shrink-0 items-center justify-center rounded-none border border-border-medium bg-input transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <Icon
          path={mdiCheck}
          size="14px"
          // MDI's check glyph is a thin solid fill (unlike lucide's 2px-stroke version), which read
          // as faint at this size — a small stroke bulks it up. stroke/strokeWidth aren't in
          // IconProps, but the component spreads arbitrary rest props onto the rendered <svg>
          // (inherited by its single <path>, which only sets its own `fill`), so cast to pass them.
          {...({ stroke: 'currentColor', strokeWidth: '1' } as Omit<
            React.ComponentProps<typeof Icon>,
            'path' | 'size'
          >)}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
