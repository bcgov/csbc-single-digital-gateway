import {
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Columns2,
  Hash,
  Layers,
  ListChecks,
  ListTodo,
  SlidersHorizontal,
  TextCursorInput,
  ToggleRight,
  Type,
  WrapText,
  type LucideIcon,
} from 'lucide-react';

/** Every authorable element. Controls become JSON-Schema properties; containers wrap children. */
export type FieldTypeId =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'multiline'
  | 'radio'
  | 'multiselect'
  | 'slider'
  | 'toggle'
  | 'oneof'
  | 'richtext'
  | 'group'
  | 'horizontal';

export type FieldGroup = 'Core' | 'Advanced' | 'Rich text' | 'Layout';

export interface FieldTypeDef {
  id: FieldTypeId;
  label: string;
  /** Short, one-line description shown on the palette card. */
  description: string;
  group: FieldGroup;
  kind: 'control' | 'container';
  icon: LucideIcon;
  /** Optional keyword aliases the palette search also matches. */
  keywords?: string[];
}

/** The palette catalogue. Order here is the palette render order within each group. */
export const FIELD_TYPES: FieldTypeDef[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'A single line of text.',
    group: 'Core',
    kind: 'control',
    icon: Type,
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
    id: 'checkbox',
    label: 'Checkbox',
    description: 'A single yes / no tick box.',
    group: 'Core',
    kind: 'control',
    icon: CheckSquare,
  },
  {
    id: 'select',
    label: 'Select',
    description: 'Pick one option from a dropdown.',
    group: 'Core',
    kind: 'control',
    icon: ChevronDownSquare,
    keywords: ['dropdown', 'enum'],
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
    id: 'multiline',
    label: 'Multiline',
    description: 'A multi-line text area.',
    group: 'Core',
    kind: 'control',
    icon: WrapText,
    keywords: ['textarea', 'paragraph'],
  },
  {
    id: 'radio',
    label: 'Radio',
    description: 'Pick one option from a visible list.',
    group: 'Advanced',
    kind: 'control',
    icon: CircleDot,
  },
  {
    id: 'multiselect',
    label: 'Multi-select',
    description: 'Pick several options.',
    group: 'Advanced',
    kind: 'control',
    icon: ListChecks,
    keywords: ['checkboxes', 'tags'],
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
    id: 'toggle',
    label: 'Toggle',
    description: 'An on / off switch.',
    group: 'Advanced',
    kind: 'control',
    icon: ToggleRight,
  },
  {
    id: 'oneof',
    label: 'One of',
    description: 'Pick one labelled option.',
    group: 'Advanced',
    kind: 'control',
    icon: ListTodo,
    keywords: ['enum', 'labelled select'],
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

/** Field types whose schema carries an enumeration the inspector edits. */
export const ENUM_FIELD_TYPES = new Set<FieldTypeId>(['select', 'radio', 'multiselect', 'oneof']);
