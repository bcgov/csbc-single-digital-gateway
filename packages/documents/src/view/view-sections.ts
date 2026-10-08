import type { Unanswered } from '../renderers/plain/plain-options';
import { pruneUnanswered } from '../renderers/plain/prune-unanswered';
import { sectionTitle } from '../renderers/ui/section-model';

// The Sections a `DocumentView` shows, for a host's "On this page" nav. Pure and React-free, and the view anchors its
// Sections from the SAME list, so a nav link never points at a Section that was hidden or has another id.

export interface ViewSection {
  /** The DOM id the view puts on the Section — a slug of its title, unique in the view. */
  readonly anchor: string;
  /** The Section's title. */
  readonly label: string;
  /** The Section element's authored `id`. */
  readonly elementId: string;
}

export interface ViewSectionsInput {
  readonly schema: unknown;
  readonly uischema: Record<string, unknown>;
  readonly data: unknown;
  readonly unanswered?: Unanswered | undefined;
}

/**
 * What a view of a Form draws: the uischema itself, or with `unanswered: 'hide'` what pruning leaves (`undefined` when
 * nothing is answered). A Funnel prunes per Form inside its renderer, so it comes back unchanged.
 */
export function shownUischema({
  schema,
  uischema,
  data,
  unanswered = 'show',
}: ViewSectionsInput): Record<string, unknown> | undefined {
  return unanswered === 'hide' && uischema['type'] === 'Form'
    ? pruneUnanswered(uischema, schema, data)
    : uischema;
}

/**
 * The outermost titled Sections a view of a Form shows, in reading order. A Section nested in another is not listed (it
 * belongs to its parent's entry); one with no title or no element `id` cannot be named or anchored, so it is skipped.
 */
export function viewSections(input: ViewSectionsInput): ViewSection[] {
  if (input.uischema['type'] !== 'Form') return [];
  const found: { label: string; elementId: string }[] = [];
  collect(shownUischema(input), found);
  const taken = new Set<string>();
  return found.map(({ label, elementId }) => {
    const anchor = uniqueSlug(label, taken);
    taken.add(anchor);
    return { anchor, label, elementId };
  });
}

function collect(element: unknown, found: { label: string; elementId: string }[]): void {
  const node = recordOf(element);
  if (node === undefined) return;
  if (node['type'] === 'Section') {
    const label = sectionTitle(node);
    const id = node['id'];
    if (label !== undefined && typeof id === 'string' && id !== '')
      found.push({ label, elementId: id });
    return;
  }
  const elements = node['elements'];
  if (Array.isArray(elements)) for (const child of elements) collect(child, found);
}

function uniqueSlug(label: string, taken: ReadonlySet<string>): string {
  const base =
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
