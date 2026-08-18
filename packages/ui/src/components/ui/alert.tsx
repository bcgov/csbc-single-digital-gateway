import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-md border px-6 py-4 text-left has-[>svg]:grid-cols-[auto_1fr] *:[svg]:translate-y-1 has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info: 'border-info-border bg-info-surface text-info-text *:[svg]:text-info-border',
        success:
          'border-success-border bg-success-surface text-success-text *:[svg]:text-icon-success',
        warning:
          'border-warning-border bg-warning-surface text-warning-text *:[svg]:text-icon-warning',
        danger:
          'border-danger-border bg-danger-surface text-danger-surface-text *:[svg]:text-icon-danger',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

function Alert({
  className,
  variant,
  role = 'note',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground font-bold',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute top-1.5 right-2', className)}
      {...props}
    />
  );
}

function AlertButtons({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-buttons"
      className={cn('flex gap-2 pt-2 justify-end group-has-[>svg]/alert:col-start-2', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction, AlertButtons };
