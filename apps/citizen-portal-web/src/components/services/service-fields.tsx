import { ChevronRight } from 'lucide-react';

/** A simple breadcrumb trail (plain anchors — avoids the Base UI breadcrumb render-prop gotcha). */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {trail.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3" aria-hidden /> : null}
            {crumb.href ? (
              <a href={crumb.href} className="hover:text-foreground hover:underline">
                {crumb.label}
              </a>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Render a string value, or a JSON dump for anything non-primitive. */
function renderValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Render a service version's `data` fields beyond title/description (those are shown by the page
 * header). Empty today — services only carry title/description — but tolerant of future fields.
 */
export function ServiceFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([key, value]) => key !== 'title' && key !== 'description' && value != null && value !== '',
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg bg-background p-4 ring-1 ring-foreground/10">
          <dt className="text-xs font-semibold text-muted-foreground capitalize">{key}</dt>
          <dd className="mt-1 text-sm text-foreground">{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
