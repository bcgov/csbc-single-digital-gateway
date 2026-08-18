import type { ReactNode } from 'react';

export function DevSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 id={id}>{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 md:p-6">{children}</div>
    </section>
  );
}
