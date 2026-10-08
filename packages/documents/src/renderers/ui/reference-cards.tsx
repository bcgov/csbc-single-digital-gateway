import { mdiClose, mdiOpenInNew } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import type { DocumentReference } from './document-reference';

/** A reference's title as shown (rule 6). */
export function referenceTitle(reference: DocumentReference): string {
  return reference.title ?? 'Untitled';
}

/** The title, as a link opening the document in a new tab when the host gives one (rules 6, 13). */
export function ReferenceTitle({
  reference,
  href,
}: {
  reference: DocumentReference;
  href: string | undefined;
}) {
  const title = referenceTitle(reference);
  if (href === undefined) return <>{title}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      {title}
      <Icon path={mdiOpenInNew} size="0.75rem" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/**
 * The chosen references as a card grid (rule 6): one column, two from the page's `sm`, three from its `lg` — container
 * queries on the fill page, never the window (doc 184 rule 17b). `onRemove` absent = no Remove buttons (rule 11).
 */
export function ReferenceCards({
  references,
  hrefOf,
  onRemove,
}: {
  references: readonly DocumentReference[];
  hrefOf: (reference: DocumentReference) => string | undefined;
  onRemove?: ((reference: DocumentReference) => void) | undefined;
}) {
  return (
    <ul
      data-slot="reference-cards"
      className="grid grid-cols-1 gap-3 @min-[40rem]/fill-page:grid-cols-2 @min-[64rem]/fill-page:grid-cols-3"
    >
      {references.map((reference) => (
        <li key={reference.id} data-slot="reference-card" className="min-w-0">
          <Card size="sm" className="h-full">
            <CardHeader>
              <CardTitle className="truncate">
                <ReferenceTitle reference={reference} href={hrefOf(reference)} />
              </CardTitle>
              {reference.description !== undefined && (
                <CardDescription className="line-clamp-3">{reference.description}</CardDescription>
              )}
              {onRemove !== undefined && (
                <CardAction>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${referenceTitle(reference)}`}
                    onClick={() => onRemove(reference)}
                  >
                    <Icon path={mdiClose} size="0.75rem" aria-hidden />
                  </Button>
                </CardAction>
              )}
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
