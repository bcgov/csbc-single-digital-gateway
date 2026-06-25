import { Button } from '@repo/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/empty';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

/** A non-functional filter chip placeholder (no backend to filter against yet). */
export function FilterChip({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" type="button" disabled>
      {label}
      <ChevronDown className="size-3.5" aria-hidden />
    </Button>
  );
}

interface ListPageProps {
  /** Left-aligned toolbar (filter chips, tabs). */
  toolbar?: ReactNode;
  /** Right-aligned actions (e.g. the "New …" button). */
  actions?: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
}

/**
 * Shared scaffold for the console's list screens. In this v1 every list renders its empty state —
 * there is no backend yet — with the prototype's toolbar chips and primary action kept as inert
 * placeholders so the layout matches the design.
 */
export function ListPage({ toolbar, actions, emptyTitle, emptyDescription }: ListPageProps) {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      {toolbar || actions ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">{toolbar}</div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-card">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            {emptyDescription ? <EmptyDescription>{emptyDescription}</EmptyDescription> : null}
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  );
}
