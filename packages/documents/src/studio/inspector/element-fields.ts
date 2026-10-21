import { descriptionState, formDescription } from '../../renderers/default/form-renderer';
import { DEFAULT_GAP } from '../../renderers/default/layout-gap';
import { DEFAULT_HEADING_LEVEL } from '../../renderers/ui/heading-options';
import {
  absentIf,
  BOOLEAN,
  choice,
  isKind,
  optionOf,
  patchElement,
  RICH_TEXT,
  SMALL_SWITCH,
  STRING,
  type InspectorField,
} from './inspector-field';
import { CARD_FIELDS, CARD_TRAILING_FIELDS } from './card-fields';
import { GRID_FIELDS } from './grid-fields';
import { ROW_FIELDS } from './row-fields';
import { SECTION_FIELDS } from './section-fields';
import { ACCORDION_FIELDS } from './accordion-fields';

const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => [n, `Heading ${n}`] as const);
const GAPS = [
  ['sm', 'Small'],
  ['md', 'Medium'],
  ['lg', 'Large'],
] as const;

const labelField = (key: string, label: string, kind: 'funnel' | 'form'): InspectorField => ({
  key,
  section: 'General',
  label,
  applies: isKind(kind),
  schema: () => STRING,
  read: (t) => t.element['label'],
  write: (content, t, value) =>
    patchElement(content, t, { label: absentIf(value) as string | undefined }),
});

/** Doc 249's fields for elements that are not Controls: Funnel (Name, Description), Form, Heading, VerticalLayout, Grid (doc 260). */
export const ELEMENT_FIELDS: readonly InspectorField[] = Object.freeze([
  labelField('funnelName', 'Name', 'funnel'),
  {
    key: 'funnelDescription',
    section: 'General',
    label: 'Description',
    applies: isKind('funnel'),
    // Plain text, unlike a Form's rich description: the Funnel has no canvas surface to format it on.
    schema: () => STRING,
    options: { component: 'textarea' },
    read: (t) => optionOf(t, 'description'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { description: absentIf(value) } }),
  },
  {
    // Doc 274 rule 31: on by default, so on writes nothing and off writes `false`.
    key: 'showSummaryPage',
    section: 'General',
    label: 'Show summary page',
    applies: isKind('funnel'),
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => optionOf(t, 'showSummaryPage') !== false,
    write: (content, t, value) =>
      patchElement(content, t, { options: { showSummaryPage: absentIf(value, true) } }),
  },
  labelField('formTitle', 'Title', 'form'),
  {
    key: 'formDescription',
    section: 'General',
    label: 'Description',
    applies: isKind('form'),
    // Rich text (doc 251 rule 7): the inspector draws doc 250's Rich text control; a legacy string reads as a paragraph.
    schema: () => RICH_TEXT,
    read: (t) => descriptionState(formDescription(t.element)),
    write: (content, t, value) => patchElement(content, t, { options: { description: value } }),
  },
  {
    key: 'headingText',
    section: 'General',
    label: 'Text',
    applies: isKind('heading'),
    schema: () => STRING,
    read: (t) => optionOf(t, 'text'),
    write: (content, t, value) => patchElement(content, t, { options: { text: absentIf(value) } }),
  },
  {
    key: 'headingLevel',
    section: 'Appearance',
    label: 'Level',
    applies: isKind('heading'),
    schema: () => choice(LEVELS),
    required: true,
    read: (t) => optionOf(t, 'level') ?? DEFAULT_HEADING_LEVEL,
    write: (content, t, value) =>
      patchElement(content, t, { options: { level: absentIf(value, DEFAULT_HEADING_LEVEL) } }),
  },
  {
    key: 'headingSize',
    section: 'Appearance',
    label: 'Size',
    applies: isKind('heading'),
    schema: () => choice(LEVELS),
    // Cleared = the same as the level.
    options: { description: 'Empty: the same as the level.' },
    read: (t) => optionOf(t, 'size'),
    write: (content, t, value) => patchElement(content, t, { options: { size: absentIf(value) } }),
  },
  // A Card's Title, Description and Size (doc 273 rule 8).
  ...CARD_FIELDS,
  // A Section's Title, Description, Variant and Inset (doc 278 rule 14).
  ...SECTION_FIELDS,
  // An Accordion group's Title, Description and Initially open (doc 279 rule 15).
  ...ACCORDION_FIELDS,
  // A Grid's Columns and Rows, ahead of its Spacing (doc 260 rule 24).
  ...GRID_FIELDS,
  // A HorizontalLayout's Columns, Distribution and Vertical alignment (doc 261 rule 19).
  ...ROW_FIELDS,
  {
    key: 'gap',
    section: 'Appearance',
    label: 'Spacing',
    applies: isKind('form', 'vertical-layout', 'grid', 'horizontal-layout', 'section'),
    schema: () => choice(GAPS),
    required: true,
    read: (t) => optionOf(t, 'gap') ?? DEFAULT_GAP,
    write: (content, t, value) =>
      patchElement(content, t, { options: { gap: absentIf(value, DEFAULT_GAP) } }),
  },
  // A Card's own Spacing and Show footer (doc 273 rules 8-9).
  ...CARD_TRAILING_FIELDS,
]);
