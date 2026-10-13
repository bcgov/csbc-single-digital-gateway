import {
  mdiBriefcaseOutline,
  mdiClose,
  mdiFileDocumentEditOutline,
  mdiHandshakeOutline,
  mdiOpenInNew,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import type { DocumentType } from '../../studio/document-types';
import type { DocumentReference } from './document-reference';
import { useReferenceSource } from './reference-source';

/** The icon a card shows for its referenced document type. */
const TYPE_ICON: Readonly<Record<DocumentType, string>> = {
  'services.service': mdiBriefcaseOutline,
  'services.service-agreement': mdiHandshakeOutline,
  'services.service-application-method': mdiFileDocumentEditOutline,
};

/** A reference's title as shown (rule 6). */
export function referenceTitle(reference: DocumentReference): string {
  return reference.title ?? 'Untitled';
}

/**
 * The title, as a link to the document when the host gives one (rules 6, 13) — in a new tab unless the host's source
 * says otherwise (doc 291 rule 8). The link's `after:` overlay stretches over the nearest positioned ancestor — the card
 * — so the whole card is clickable.
 */
export function ReferenceTitle({
  reference,
  href,
}: {
  reference: DocumentReference;
  href: string | undefined;
}) {
  const newTab = useReferenceSource()?.openInNewTab !== false;
  const title = referenceTitle(reference);
  if (href === undefined) return <>{title}</>;
  return (
    <a
      href={href}
      {...(newTab && { target: '_blank', rel: 'noreferrer' })}
      className="inline-flex items-center gap-1 underline-offset-4 outline-none group-hover/card:underline after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
    >
      {title}
      {newTab ? (
        <>
          <Icon path={mdiOpenInNew} size="0.75rem" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : null}
    </a>
  );
}

/**
 * The chosen references as a three-column card grid (rule 6), each card centred: the document type's icon, the title
 * (the referenced document's `uischema.label`) and its description (`uischema.options.description`) clamped to two
 * lines. `onRemove` absent = no Remove buttons (rule 11).
 */
export function ReferenceCards({
  type,
  references,
  hrefOf,
  onRemove,
}: {
  type: DocumentType;
  references: readonly DocumentReference[];
  hrefOf: (reference: DocumentReference) => string | undefined;
  onRemove?: ((reference: DocumentReference) => void) | undefined;
}) {
  return (
    <ul data-slot="reference-cards" className="grid grid-cols-3 gap-3">
      {references.map((reference) => (
        <li key={reference.id} data-slot="reference-card" className="min-w-0">
          <Card size="sm" centered className="relative h-full data-[size=sm]:py-12">
            <CardHeader className="justify-items-center">
              <Icon
                path={TYPE_ICON[type]}
                size="1.5rem"
                className="text-muted-foreground"
                aria-hidden
              />
              <CardTitle className="w-full truncate text-base">
                <ReferenceTitle reference={reference} href={hrefOf(reference)} />
              </CardTitle>
              {reference.description !== undefined && (
                <CardDescription className="line-clamp-2 w-full">
                  {reference.description}
                </CardDescription>
              )}
            </CardHeader>
            {onRemove !== undefined && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1 right-1 z-10"
                aria-label={`Remove ${referenceTitle(reference)}`}
                onClick={() => onRemove(reference)}
              >
                <Icon path={mdiClose} size="0.75rem" aria-hidden />
              </Button>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
