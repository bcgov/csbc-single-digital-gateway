import type { DocumentReferenceSource } from '@repo/documents/studio';
import { DocumentView, viewSections, type DocumentViewProps } from '@repo/documents/view';
import {
  mdiCardAccountDetailsOutline,
  mdiClipboardCheckOutline,
  mdiFileDocumentOutline,
  mdiHelpCircleOutline,
  mdiPulse,
  mdiSend,
  mdiTextBoxOutline,
} from '@mdi/js';
import { useMemo } from 'react';
import { OnThisPageLayout, type OnThisPageItem } from '@/components/layout/on-this-page';

/** The variant a service authors for citizens; matched case-insensitively (authored as `Citizen`). */
export const CITIZEN_VARIANT = 'citizen';

/**
 * The uischema the citizen page renders: the service's citizen variant, else `default`. The root Form's title and
 * description are dropped — the page header already shows the service's own, and a second `h1` would repeat it.
 */
export function citizenUischema(
  variants: Readonly<Record<string, Record<string, unknown>>>,
): Record<string, unknown> {
  const name = Object.keys(variants).find((key) => key.toLowerCase() === CITIZEN_VARIANT);
  const root = (name === undefined ? undefined : variants[name]) ?? variants['default'] ?? {};
  const { label: _label, ...rest } = root;
  const options = root['options'];
  if (typeof options !== 'object' || options === null || Array.isArray(options)) return rest;
  const { description: _description, ...keptOptions } = options as Record<string, unknown>;
  return { ...rest, options: keptOptions };
}

/**
 * Icons for the section titles the service template ships with; any other title gets a generic page icon, so a
 * collapsed rail still shows one per entry.
 */
const SECTION_ICONS: Readonly<Record<string, string>> = {
  overview: mdiFileDocumentOutline,
  'eligibility criteria': mdiClipboardCheckOutline,
  'how to apply': mdiSend,
  'your activity': mdiPulse,
  'help and information': mdiHelpCircleOutline,
  'contact information': mdiCardAccountDetailsOutline,
};

function sectionIcon(label: string): string {
  return SECTION_ICONS[label.toLowerCase()] ?? mdiTextBoxOutline;
}

/**
 * The body of a service page: the service's citizen variant read back (unanswered fields and the sections left empty
 * are hidden), with an "On this page" rail built from the outermost Section titles it shows. The rail's links and the
 * Sections' ids come from the same `viewSections` call, so they always agree.
 */
export function ServiceSections({
  schema,
  variants,
  data,
  references,
}: {
  schema: Record<string, unknown>;
  variants: Readonly<Record<string, Record<string, unknown>>>;
  data: Record<string, unknown>;
  /** Doc 291 rule 8: links the read-back's application-method cards to their apply page. */
  references?: DocumentReferenceSource | undefined;
}) {
  const uischema = useMemo(() => citizenUischema(variants), [variants]);
  const items = useMemo<OnThisPageItem[]>(
    () =>
      viewSections({ schema, uischema, data, unanswered: 'hide' }).map((section) => ({
        id: section.anchor,
        label: section.label,
        icon: sectionIcon(section.label),
      })),
    [schema, uischema, data],
  );
  return (
    <OnThisPageLayout items={items}>
      {/* Scroll margin so a jumped-to Section's heading isn't flush with the viewport top. */}
      <div className="flex min-w-0 flex-1 flex-col [&_[data-slot=section][id]]:scroll-mt-6">
        <DocumentView
          schema={schema as DocumentViewProps['schema']}
          uischema={uischema}
          data={data}
          unanswered="hide"
          anchorSections
          {...(references !== undefined && { references })}
        />
      </div>
    </OnThisPageLayout>
  );
}
