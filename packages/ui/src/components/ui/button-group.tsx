import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';
import { Separator } from '@ui/components/ui/separator';

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: '',
        vertical: 'flex-col',
      },
      variant: {
        // BCDS's ButtonGroup — a semantic grouping only, buttons keep their normal styling and
        // spacing.
        default: 'gap-2',
        // shadcn's segmented-control look — adjoining buttons with shared borders and only the
        // outer corners rounded. Kept as an opt-in for cases that want it.
        joined: '',
      },
      alignment: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
      },
    },
    compoundVariants: [
      {
        variant: 'joined',
        orientation: 'horizontal',
        className:
          '*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-md! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0',
      },
      {
        variant: 'joined',
        orientation: 'vertical',
        className:
          '*:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-md! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
      },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
      alignment: 'start',
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  variant,
  alignment,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      data-variant={variant}
      className={cn(buttonGroupVariants({ orientation, variant, alignment }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          "flex items-center gap-2 rounded-md border bg-muted px-2.5 text-xs/relaxed font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'button-group-text',
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto',
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
