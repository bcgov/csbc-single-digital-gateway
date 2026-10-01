import {
  mdiCheckboxMarkedOutline,
  mdiFormatHeaderPound,
  mdiToggleSwitchOutline,
  mdiViewSequentialOutline,
} from '@mdi/js';
import { nanoid } from 'nanoid';
import type { DocumentContent, DocumentKind, DocumentType, Uischema } from './document-types';
import { newId } from './element-ids';

/** What placing an item adds (doc 238): the uischema element, and the schema properties it needs (a control's). */
export interface PaletteCreation {
  element: Uischema;
  properties?: Record<string, Record<string, unknown>>;
}

/** One thing an author can place on a Form's page. */
export interface PaletteItem {
  /** Unique in a list; the drag source carries it as `data-palette-item`. */
  id: string;
  label: string;
  /** An `@mdi/js` path. */
  icon: string;
  /** The heading the item is listed under. */
  group: string;
  /** Extra search terms. */
  keywords?: string[];
  /** A fresh element (and properties) on every call (rule 3). */
  create: () => PaletteCreation;
}

/** What the host decides a palette by: the open document. */
export interface PaletteContext {
  type: DocumentType | null;
  kind: DocumentKind | null;
  content: DocumentContent;
}

export type PaletteResolver = (context: PaletteContext) => PaletteItem[];

/** A boolean Control over a new `nanoid(8)` property (doc 238 rule 3). */
function booleanControl(title: string, options?: Record<string, unknown>): PaletteCreation {
  const key = nanoid(8);
  return {
    element: {
      id: newId(),
      type: 'Control',
      scope: `#/properties/${key}`,
      ...(options !== undefined && { options }),
    },
    properties: { [key]: { type: 'boolean', title } },
  };
}

/**
 * Every studio renderer an author places (doc 238 rule 2) — never the Form (a page's root) or the placeholder. Layout
 * first: groups list in order of first appearance.
 */
export const DEFAULT_PALETTE_ITEMS: PaletteItem[] = [
  {
    id: 'vertical-layout',
    label: 'Vertical layout',
    icon: mdiViewSequentialOutline,
    group: 'Layout',
    keywords: ['stack', 'column', 'group'],
    create: () => ({ element: { id: newId(), type: 'VerticalLayout', elements: [] } }),
  },
  {
    id: 'heading',
    label: 'Heading',
    icon: mdiFormatHeaderPound,
    group: 'Content',
    keywords: ['title', 'text'],
    // No text: the studio shows its grey placeholder, edited in place.
    create: () => ({ element: { id: newId(), type: 'Heading', options: { level: 2 } } }),
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    icon: mdiCheckboxMarkedOutline,
    group: 'Fields',
    keywords: ['boolean', 'yes', 'no'],
    create: () => booleanControl('Untitled checkbox'),
  },
  {
    id: 'switch',
    label: 'Switch',
    icon: mdiToggleSwitchOutline,
    group: 'Fields',
    keywords: ['boolean', 'toggle', 'on', 'off'],
    create: () => booleanControl('Untitled switch', { component: 'switch' }),
  },
];

/** The palette when the host chooses none: every default item, whatever the document (rule 1). */
export const defaultPalette: PaletteResolver = () => DEFAULT_PALETTE_ITEMS;

/** `items` without any whose id repeats an earlier one's (rule 4), so a drop always resolves to one item. */
export function uniqueItems(items: readonly PaletteItem[]): PaletteItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
