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
  group: FieldGroup;
  kind: 'control' | 'container';
  icon: LucideIcon;
  /** Optional keyword aliases the palette search also matches. */
  keywords?: string[];
}

/** The palette catalogue. Order here is the palette render order within each group. */
export const FIELD_TYPES: FieldTypeDef[] = [
  { id: 'text', label: 'Text', group: 'Core', kind: 'control', icon: Type },
  { id: 'number', label: 'Number', group: 'Core', kind: 'control', icon: Hash },
  { id: 'checkbox', label: 'Checkbox', group: 'Core', kind: 'control', icon: CheckSquare },
  {
    id: 'select',
    label: 'Select',
    group: 'Core',
    kind: 'control',
    icon: ChevronDownSquare,
    keywords: ['dropdown', 'enum'],
  },
  { id: 'date', label: 'Date', group: 'Core', kind: 'control', icon: Calendar },
  {
    id: 'multiline',
    label: 'Multiline',
    group: 'Core',
    kind: 'control',
    icon: WrapText,
    keywords: ['textarea', 'paragraph'],
  },
  { id: 'radio', label: 'Radio', group: 'Advanced', kind: 'control', icon: CircleDot },
  {
    id: 'multiselect',
    label: 'Multi-select',
    group: 'Advanced',
    kind: 'control',
    icon: ListChecks,
    keywords: ['checkboxes', 'tags'],
  },
  { id: 'slider', label: 'Slider', group: 'Advanced', kind: 'control', icon: SlidersHorizontal },
  { id: 'toggle', label: 'Toggle', group: 'Advanced', kind: 'control', icon: ToggleRight },
  {
    id: 'oneof',
    label: 'One of',
    group: 'Advanced',
    kind: 'control',
    icon: ListTodo,
    keywords: ['enum', 'labelled select'],
  },
  {
    id: 'richtext',
    label: 'Rich text',
    group: 'Rich text',
    kind: 'control',
    icon: TextCursorInput,
    keywords: ['wysiwyg', 'lexical'],
  },
  { id: 'group', label: 'Group', group: 'Layout', kind: 'container', icon: Layers },
  { id: 'horizontal', label: 'Horizontal', group: 'Layout', kind: 'container', icon: Columns2 },
];

export const FIELD_TYPE_BY_ID: Record<FieldTypeId, FieldTypeDef> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.id, t]),
) as Record<FieldTypeId, FieldTypeDef>;

/** Field types whose schema carries an enumeration the inspector edits. */
export const ENUM_FIELD_TYPES = new Set<FieldTypeId>(['select', 'radio', 'multiselect', 'oneof']);
