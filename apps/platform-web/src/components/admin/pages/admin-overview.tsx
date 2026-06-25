import { Info } from 'lucide-react';

/** Admin overview — placeholder until the dashboard is defined. */
export function AdminOverview() {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" aria-hidden />
        Platform administration — the admin overview is being set up.
      </div>
    </div>
  );
}
