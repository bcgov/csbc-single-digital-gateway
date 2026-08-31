/**
 * Service details section derivation (feature 174).
 *
 * The Service details page and the service sidebar's "Service details" submenu are both driven by
 * the service's uischema rather than a hardcoded list: every **top-level** `Group` element becomes
 * an anchored page section, and anything else renders in place. Both callers use the helpers here,
 * so the sidebar's `#hash` links can never drift from the rendered `<section id>`s.
 *
 * Types are structural on purpose — this module is pure and carries no JSONForms import, so it can
 * be unit-tested and consumed from the sidebar without pulling the (lazily-loaded) JSONForms chunk
 * into the shell.
 */

// `slugify` is shared with `@repo/react/uischema-edit` so a section's `#hash` anchor and its
// windowed-edit id are produced by ONE rule and can never drift. That module is pure (no React, no
// `@jsonforms/*`), so importing it here keeps this file free of the lazy JSONForms chunk.
import { slugify } from '@repo/react/uischema-edit';

export { slugify };

/** The shape we inspect on a uischema element. Anything else on the element is passed through. */
export interface UiElement {
  type?: unknown;
  label?: unknown;
  elements?: unknown;
  [key: string]: unknown;
}

/** A top-level `Group` — rendered as its own anchored `<section>`. */
export interface SectionRun {
  kind: 'section';
  /** Anchor id — the `<section id>` and the sidebar link's `#hash`. Unique within one uischema. */
  anchor: string;
  label: string;
  /** The Group element itself — dispatch it as-is; `GroupLayoutRenderer` renders its heading. */
  element: UiElement;
}

/** A run of consecutive non-Group top-level elements — rendered in place, with no heading. */
export interface LooseRun {
  kind: 'loose';
  elements: UiElement[];
}

export type DerivedRun = SectionRun | LooseRun;

/** A section as the sidebar consumes it. */
export interface ServiceSectionAnchor {
  anchor: string;
  label: string;
}

const asElements = (uischema: unknown): UiElement[] => {
  const elements = (uischema as { elements?: unknown } | null | undefined)?.elements;
  return Array.isArray(elements) ? (elements as UiElement[]) : [];
};

const isGroup = (element: UiElement): boolean => element.type === 'Group';

const labelOf = (element: UiElement): string =>
  typeof element.label === 'string' ? element.label.trim() : '';

/**
 * Split a service uischema's top-level elements into ordered runs. Groups become anchored sections;
 * every maximal run of consecutive non-Group elements becomes one loose run. Document order is
 * preserved, so a control authored before the first Group still renders before it.
 *
 * Only the top level is inspected — a `Group` nested inside another layout stays a plain child of
 * that layout and is rendered by `GroupLayoutRenderer` in the ordinary way.
 */
export function deriveRuns(uischema: unknown): DerivedRun[] {
  const runs: DerivedRun[] = [];
  // Anchors must be unique within one uischema: a repeated label gets a -2, -3, … suffix.
  const used = new Map<string, number>();
  let loose: UiElement[] = [];

  const flushLoose = () => {
    if (loose.length > 0) {
      runs.push({ kind: 'loose', elements: loose });
      loose = [];
    }
  };

  asElements(uischema).forEach((element, index) => {
    if (!isGroup(element)) {
      loose.push(element);
      return;
    }
    flushLoose();

    const label = labelOf(element);
    // A Group with no usable label still needs a stable anchor to be linkable.
    const base = slugify(label) === '' ? `section-${index + 1}` : slugify(label);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const anchor = seen === 0 ? base : `${base}-${seen + 1}`;

    runs.push({ kind: 'section', anchor, label, element });
  });

  flushLoose();
  return runs;
}

/** Just the sections, in order — what the sidebar submenu renders. */
export function deriveSections(uischema: unknown): SectionRun[] {
  return deriveRuns(uischema).filter((run): run is SectionRun => run.kind === 'section');
}

/** The anchor list derived from a uischema: `{ anchor, label }` per top-level Group. */
export function deriveSectionAnchors(uischema: unknown): ServiceSectionAnchor[] {
  return deriveSections(uischema).map(({ anchor, label }) => ({ anchor, label }));
}

/**
 * The full Service details section list: the Groups derived from the definition, followed by the
 * console's always-present sections. Used by the sidebar submenu AND the page body so the two agree
 * on both the order and the always-on tail.
 *
 * The always-sections are appended, never deduplicated away — if a definition happens to author a
 * Group whose label slugifies to the same anchor, the always-section keeps its own anchor via the
 * usual `-2` suffix rule applied here.
 */
export function serviceSectionAnchors(
  uischema: unknown,
  always: readonly ServiceSectionAnchor[] = [],
): ServiceSectionAnchor[] {
  return [...deriveSectionAnchors(uischema), ...alwaysSectionAnchors(uischema, always)];
}

/**
 * Just the always-present tail, with each anchor reconciled against the anchors the definition
 * derives (a clash takes the same `-2`, `-3` … suffix). The page body renders these itself rather
 * than through JsonForms, so it needs the tail alone — taking a slice off
 * {@link serviceSectionAnchors} would silently return everything when `always` is empty.
 */
export function alwaysSectionAnchors(
  uischema: unknown,
  always: readonly ServiceSectionAnchor[],
): ServiceSectionAnchor[] {
  const taken = new Set(deriveSectionAnchors(uischema).map((section) => section.anchor));
  return always.map((section) => {
    let anchor = section.anchor;
    for (let n = 2; taken.has(anchor); n += 1) {
      anchor = `${section.anchor}-${n}`;
    }
    taken.add(anchor);
    return { ...section, anchor };
  });
}
