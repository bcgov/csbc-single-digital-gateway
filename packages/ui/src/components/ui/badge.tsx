import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none  h-6  py-0.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-2.5!',
  {
    variants: {
      color: {
        'bc-blue': 'bg-bcgov-blue border-blue-90 text-white',
        'bc-gold': 'bg-bcgov-gold border-blue-90 text-foreground',
        dark: 'bg-gray-110 border-blue-90 text-white',
        blue: 'bg-info-surface border-info-border text-foreground',
        grey: 'bg-gray-20 border-border-dark text-foreground',
        green: 'bg-success-surface border-success-border text-foreground',
        red: 'bg-danger-surface border-danger-border text-foreground',
        yellow: 'bg-warning-surface border-warning-border text-foreground',
      },
      shape: {
        rectangular: 'rounded-xs',
        rounded: 'rounded-full',
      },
      size: {
        sm: 'px-2',
        medium: 'px-4',
      },
    },
    defaultVariants: {
      color: 'blue',
      shape: 'rectangular',
      size: 'sm',
    },
  },
);

function Badge({
  className,
  color = 'blue',
  shape = 'rectangular',
  size = 'sm',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ color, shape, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      color,
      shape,
      size,
    },
  });
}

export { Badge, badgeVariants };
