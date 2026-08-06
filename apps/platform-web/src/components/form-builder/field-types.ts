import {
  Calendar,
  CalendarClock,
  CalendarRange,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Clock,
  Columns2,
  FileText,
  Hash,
  Heading,
  Layers,
  ListChecks,
  MapPin,
  Pilcrow,
  SlidersHorizontal,
  TextCursorInput,
  Type,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every authorable element. Controls become JSON-Schema properties; containers wrap children;
 * display fields render presentational content (heading / paragraph / rich text) and collect NO
 * data (they emit a `Label` uischema element with no `schema.properties` entry — see feature 81).
 */
export type FieldTypeId =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'daterange'
  | 'time'
  | 'datetime'
  | 'radio'
  | 'checkboxes'
  | 'slider'
  | 'address'
  | 'richtext'
  | 'heading'
  | 'paragraph'
  | 'richtextdisplay'
  | 'group'
  | 'horizontal';

export type FieldGroup = 'Core' | 'Advanced' | 'Rich text' | 'Display' | 'Layout';

export interface FieldTypeDef {
  id: FieldTypeId;
  label: string;
  /** Short, one-line description shown on the palette card. */
  description: string;
  group: FieldGroup;
  kind: 'control' | 'container' | 'display';
  icon: LucideIcon;
  /** Optional keyword aliases the palette search also matches. */
  keywords?: string[];
}

/** The palette catalogue. Order here is the palette render order within each group. */
export const FIELD_TYPES: FieldTypeDef[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'One or more lines of text.',
    group: 'Core',
    kind: 'control',
    icon: Type,
    keywords: ['textarea', 'paragraph', 'multiline', 'string'],
  },
  {
    id: 'number',
    label: 'Number',
    description: 'A numeric value.',
    group: 'Core',
    kind: 'control',
    icon: Hash,
  },
  {
    id: 'boolean',
    label: 'Boolean',
    description: 'A single yes/no value.',
    group: 'Core',
    kind: 'control',
    icon: CheckSquare,
    keywords: ['checkbox', 'toggle', 'switch', 'yes/no'],
  },
  {
    id: 'select',
    label: 'Select',
    description: 'Pick from a dropdown — single or multiple.',
    group: 'Core',
    kind: 'control',
    icon: ChevronDownSquare,
    keywords: ['dropdown', 'enum', 'choice', 'multi-select'],
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Pick a date from a calendar.',
    group: 'Core',
    kind: 'control',
    icon: Calendar,
  },
  {
    id: 'radio',
    label: 'Radio',
    description: 'Pick one option from a visible list.',
    group: 'Advanced',
    kind: 'control',
    icon: CircleDot,
    keywords: ['choice', 'single'],
  },
  {
    id: 'checkboxes',
    label: 'Checkbox group',
    description: 'Pick several from a visible list.',
    group: 'Advanced',
    kind: 'control',
    icon: ListChecks,
    keywords: ['checkboxes', 'multi', 'tags', 'choice'],
  },
  {
    id: 'slider',
    label: 'Slider',
    description: 'Choose a number on a range.',
    group: 'Advanced',
    kind: 'control',
    icon: SlidersHorizontal,
  },
  {
    id: 'daterange',
    label: 'Date range',
    description: 'Pick a start and end date.',
    group: 'Advanced',
    kind: 'control',
    icon: CalendarRange,
    keywords: ['range', 'dates', 'period', 'from', 'to'],
  },
  {
    id: 'time',
    label: 'Time',
    description: 'Pick a time of day.',
    group: 'Advanced',
    kind: 'control',
    icon: Clock,
    keywords: ['hour', 'minute', 'am', 'pm', 'clock'],
  },
  {
    id: 'datetime',
    label: 'Date & time',
    description: 'Pick a date and time.',
    group: 'Advanced',
    kind: 'control',
    icon: CalendarClock,
    keywords: ['datetime', 'date', 'time', 'timestamp', 'when'],
  },
  {
    id: 'address',
    label: 'Address',
    description: 'An address value.',
    group: 'Advanced',
    kind: 'control',
    icon: MapPin,
    keywords: ['location', 'street', 'postal', 'zip', 'country', 'state', 'province'],
  },
  {
    id: 'richtext',
    label: 'Rich text',
    description: 'Formatted text with styling.',
    group: 'Rich text',
    kind: 'control',
    icon: TextCursorInput,
    keywords: ['wysiwyg', 'lexical'],
  },
  {
    id: 'heading',
    label: 'Heading',
    description: 'Display only — a section heading.',
    group: 'Display',
    kind: 'display',
    icon: Heading,
    keywords: ['title', 'subheading', 'h2', 'h3'],
  },
  {
    id: 'paragraph',
    label: 'Paragraph',
    description: 'Display only — a block of guidance text.',
    group: 'Display',
    kind: 'display',
    icon: Pilcrow,
    keywords: ['text', 'copy', 'instructions'],
  },
  {
    id: 'richtextdisplay',
    label: 'Rich text',
    description: 'Display only — formatted content to read.',
    group: 'Display',
    kind: 'display',
    icon: FileText,
    keywords: ['formatted', 'content', 'guidance', 'lexical'],
  },
  {
    id: 'group',
    label: 'Group',
    description: 'Group fields under a heading.',
    group: 'Layout',
    kind: 'container',
    icon: Layers,
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Lay fields out side by side.',
    group: 'Layout',
    kind: 'container',
    icon: Columns2,
  },
];

export const FIELD_TYPE_BY_ID: Record<FieldTypeId, FieldTypeDef> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.id, t]),
) as Record<FieldTypeId, FieldTypeDef>;

/**
 * Choice fields (feature 156, Step 2): every one carries an authored `{ label, value }[]` the inspector
 * edits (with reordering) and serializes to `uischema.options.choices` for the unified choice renderer.
 * `select` also carries a single/multi switch; `radio` is single, `checkboxes` multi.
 */
export const CHOICE_FIELD_TYPES = new Set<FieldTypeId>(['select', 'radio', 'checkboxes']);
