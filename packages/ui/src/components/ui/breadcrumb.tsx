import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@ui/lib/utils';
import { mdiChevronRight, mdiDotsHorizontal } from '@mdi/js';
import { Icon } from '@mdi/react';

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-xs/relaxed wrap-break-word text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `text-[length:inherit]` because `@layer base` sizes a bare `li` at `--app-text-base` (`styles/base.css`),
 * which is an explicit font-size ON THE ELEMENT and so beats the `text-xs/relaxed` inherited from
 * `BreadcrumbList`: every item rendered at 16px inside a 12px list. The same defect the rich text theme
 * documents for `p` (`inputs/rich-text/shared.ts`), and the same fix — the size goes back under the LIST's
 * control, so a consumer still sets it in one place.
 */
function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1 text-[length:inherit]', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<'a'>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn('transition-colors hover:text-foreground', className),
      },
      props,
    ),
    render,
    state: {
      slot: 'breadcrumb-link',
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      // A separator is an `li` too, so it takes the same base-layer font-size as an item (see above).
      className={cn('text-[length:inherit] [&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <Icon path={mdiChevronRight} size="14px" />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex size-4 items-center justify-center [&>svg]:size-3.5', className)}
      {...props}
    >
      <Icon path={mdiDotsHorizontal} size="14px" />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
