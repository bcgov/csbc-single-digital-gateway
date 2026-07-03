import * as React from 'react';

import { cn } from '@ui/lib/utils';

function Card({
  className,
  size = 'default',
  centered = false,
  column = false,
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  centered?: boolean;
  column?: boolean;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-column={column ? 'true' : undefined}
      data-centered={centered ? 'true' : undefined}
      className={cn(
        'ring-foreground/10 bg-card text-card-foreground overflow-hidden rounded-xs py-4 shadow-xs ring-1 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl group/card flex',
        column
          ? 'flex-row items-center gap-0'
          : 'flex-col gap-4 data-[size=sm]:gap-2 data-[size=sm]:py-2',
        centered && 'text-center',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-2 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-2 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] group-data-column/card:flex-1',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('text-lg font-bold', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'w-fit px-4 group-data-[size=sm]/card:px-2 group-data-centered/card:mx-auto group-data-column/card:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function CardIconAction({
  size = 'lg',
  className,
  children,
}: {
  size?: 'sm' | 'lg';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <CardAction
      className={cn('p-0 mx-4 group-data-column/card:mx-0 group-data-column/card:pl-4', className)}
    >
      <div className={cn('bg-blue-10', size === 'sm' ? 'p-2' : 'p-5')}>{children}</div>
    </CardAction>
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4 group-data-[size=sm]/card:px-2', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'rounded-b-xl px-4 group-data-[size=sm]/card:px-2 [.border-t]:pt-4 group-data-[size=sm]/card:[.border-t]:pt-2 flex items-center',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardIconAction,
  CardTitle,
};
