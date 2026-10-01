import { FADE_IN, FADE_OUT } from './canvas-zoom';

/**
 * A focused Form's page body (doc 233 rule 4): an exploration placeholder — its title, then its fields.
 * While the node is growing or shrinking it is pinned to the frame and clipped by it, so it is revealed as the node
 * zooms open; once `open`, it lays out normally and its height is the page's.
 */
export function FormPageBody({
  label,
  fields,
  open = false,
  closing = false,
}: {
  label: string;
  fields: readonly string[];
  open?: boolean;
  /** Back: fading out over the card as the node shrinks, and hidden from assistive tech — the card is what's there. */
  closing?: boolean;
}) {
  const layout = open && !closing ? 'relative' : 'absolute inset-0 overflow-hidden';
  return (
    <article
      aria-label={`${label} page`}
      aria-hidden={closing || undefined}
      className={`pointer-events-none flex flex-col gap-6 rounded-md bg-background p-12 ${layout} ${closing ? FADE_OUT : FADE_IN}`}
    >
      <h1 className="text-h3 font-semibold">{label}</h1>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fields yet</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <li
              key={`${i}:${field}`}
              className="rounded-md border border-dashed border-border px-3 py-2 text-sm"
            >
              {field}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
