import {
  mdiCheckboxMarkedOutline,
  mdiCheckboxMultipleMarkedOutline,
  mdiFormatHeaderPound,
  mdiFormatParagraph,
  mdiFormDropdown,
  mdiFormTextbox,
  mdiMinus,
  mdiNumeric,
  mdiRadioboxMarked,
  mdiSelectMultiple,
  mdiTableLarge,
  mdiTextBoxEditOutline,
  mdiTextBoxOutline,
  mdiToggleSwitchOutline,
  mdiViewColumnOutline,
  mdiViewGridOutline,
  mdiViewSequentialOutline,
} from '@mdi/js';
import { nanoid } from 'nanoid';
import type { DocumentContent, DocumentKind, DocumentType, Uischema } from './document-types';
import { newId } from './element-ids';
import { RECORD_FIELD_ITEMS } from './record-palette-items';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS } from '../renderers/default/grid-placement';

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

/**
 * A Control over a new `nanoid(8)` property of `type` (doc 238 rule 3, doc 239 rule 13), with any `extra` schema
 * keywords (a choice's `oneOf`, doc 244 rule 18).
 */
function newControl(
  type: 'array' | 'boolean' | 'number' | 'object' | 'string',
  title: string,
  options?: Record<string, unknown>,
  extra?: Record<string, unknown>,
): PaletteCreation {
  const key = nanoid(8);
  return {
    element: {
      id: newId(),
      type: 'Control',
      scope: `#/properties/${key}`,
      ...(options !== undefined && { options }),
    },
    properties: { [key]: { type, title, ...extra } },
  };
}

/** A string choice Control starting with one option (doc 244 rule 18) — a fresh `oneOf` on every call. */
function newChoice(component: 'select' | 'radio-group', title: string): PaletteCreation {
  return newControl(
    'string',
    title,
    { component },
    {
      oneOf: [{ const: 'option-1', title: 'Option 1' }],
    },
  );
}

/** An array choice Control starting with one option (doc 245 rule 15) — fresh `items` on every call. */
function newMultiChoice(
  component: 'multi-select' | 'checkbox-group',
  title: string,
): PaletteCreation {
  return newControl(
    'array',
    title,
    { component },
    { uniqueItems: true, items: { oneOf: [{ const: 'option-1', title: 'Option 1' }] } },
  );
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
    id: 'horizontal-layout',
    label: 'Horizontal layout',
    icon: mdiViewColumnOutline,
    group: 'Layout',
    keywords: ['row', 'columns', 'side by side', 'inline'],
    // Doc 261 rule 21: every setting at its default — 12 columns, Flex, Top.
    create: () => ({ element: { id: newId(), type: 'HorizontalLayout', elements: [] } }),
  },
  {
    id: 'grid',
    label: 'Grid',
    icon: mdiViewGridOutline,
    group: 'Layout',
    keywords: ['columns', 'rows', 'table', 'cells'],
    // Doc 260 rule 28: a 2×2 grid, written out so the inspector and template rules see its size.
    create: () => ({
      element: {
        id: newId(),
        type: 'Grid',
        elements: [],
        options: { columns: DEFAULT_GRID_COLUMNS, rows: DEFAULT_GRID_ROWS },
      },
    }),
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
    id: 'separator',
    label: 'Separator',
    icon: mdiMinus,
    group: 'Content',
    keywords: ['divider', 'rule', 'line'],
    create: () => ({ element: { id: newId(), type: 'Separator' } }),
  },
  {
    id: 'rich-content',
    label: 'Rich content',
    icon: mdiFormatParagraph,
    group: 'Content',
    keywords: ['paragraph', 'text', 'formatted', 'body'],
    // No content: the studio shows its grey placeholder, edited in place (doc 250 rule 15).
    create: () => ({ element: { id: newId(), type: 'RichContent' } }),
  },
  {
    id: 'table',
    label: 'Table',
    icon: mdiTableLarge,
    group: 'Content',
    keywords: ['grid', 'rows', 'columns', 'static'],
    // Authored content, no schema property: placeable in every variant (doc 265 rule 10).
    create: () => ({
      element: {
        id: newId(),
        type: 'Table',
        options: { headers: ['Column 1', 'Column 2'], rows: [['', '']] },
      },
    }),
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    icon: mdiCheckboxMarkedOutline,
    group: 'Basic fields',
    keywords: ['boolean', 'yes', 'no'],
    create: () => newControl('boolean', 'Untitled checkbox'),
  },
  {
    id: 'switch',
    label: 'Switch',
    icon: mdiToggleSwitchOutline,
    group: 'Basic fields',
    keywords: ['boolean', 'toggle', 'on', 'off'],
    create: () => newControl('boolean', 'Untitled switch', { component: 'switch' }),
  },
  {
    id: 'text',
    label: 'Text',
    icon: mdiFormTextbox,
    group: 'Basic fields',
    keywords: ['string', 'input', 'text'],
    create: () => newControl('string', 'Untitled text'),
  },
  {
    id: 'textarea',
    label: 'Text area',
    icon: mdiTextBoxOutline,
    group: 'Basic fields',
    keywords: ['string', 'paragraph', 'multiline'],
    create: () => newControl('string', 'Untitled text area', { component: 'textarea' }),
  },
  {
    id: 'rich-text',
    label: 'Rich text',
    icon: mdiTextBoxEditOutline,
    group: 'Basic fields',
    keywords: ['formatted', 'paragraph', 'editor'],
    // A rich text property requires its `root` (doc 250 rules 1, 16).
    create: () => newControl('object', 'Untitled rich text', undefined, { required: ['root'] }),
  },
  {
    id: 'number',
    label: 'Number',
    icon: mdiNumeric,
    group: 'Basic fields',
    keywords: ['number', 'numeric', 'amount', 'integer'],
    create: () => newControl('number', 'Untitled number'),
  },
  {
    id: 'select',
    label: 'Select',
    icon: mdiFormDropdown,
    group: 'Basic fields',
    keywords: ['choice', 'dropdown', 'combobox', 'options'],
    create: () => newChoice('select', 'Untitled select'),
  },
  {
    id: 'radio-group',
    label: 'Radio group',
    icon: mdiRadioboxMarked,
    group: 'Basic fields',
    keywords: ['choice', 'radio', 'options'],
    create: () => newChoice('radio-group', 'Untitled radio group'),
  },
  {
    id: 'multi-select',
    label: 'Multi-select',
    icon: mdiSelectMultiple,
    group: 'Basic fields',
    keywords: ['choice', 'multiple', 'combobox', 'tags', 'options'],
    create: () => newMultiChoice('multi-select', 'Untitled multi-select'),
  },
  {
    id: 'checkbox-group',
    label: 'Checkbox group',
    icon: mdiCheckboxMultipleMarkedOutline,
    group: 'Basic fields',
    keywords: ['choice', 'multiple', 'checkboxes', 'options'],
    create: () => newMultiChoice('checkbox-group', 'Untitled checkbox group'),
  },
  ...RECORD_FIELD_ITEMS,
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
