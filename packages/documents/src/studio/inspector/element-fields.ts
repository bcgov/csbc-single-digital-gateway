import { DEFAULT_GAP } from '../../renderers/default/layout-gap';
import { DEFAULT_HEADING_LEVEL } from '../../renderers/ui/heading-options';
import {
  absentIf,
  choice,
  isKind,
  optionOf,
  patchElement,
  STRING,
  type InspectorField,
} from './inspector-field';

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

/** Doc 249's fields for elements that are not Controls: Funnel, Form, Heading, VerticalLayout. */
export const ELEMENT_FIELDS: readonly InspectorField[] = Object.freeze([
  labelField('funnelName', 'Name', 'funnel'),
  labelField('formTitle', 'Title', 'form'),
  {
    key: 'formDescription',
    section: 'General',
    label: 'Description',
    applies: isKind('form'),
    schema: () => STRING,
    options: { component: 'textarea' },
    read: (t) => optionOf(t, 'description'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { description: absentIf(value) } }),
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
  {
    key: 'gap',
    section: 'Appearance',
    label: 'Spacing',
    applies: isKind('form', 'vertical-layout'),
    schema: () => choice(GAPS),
    required: true,
    read: (t) => optionOf(t, 'gap') ?? DEFAULT_GAP,
    write: (content, t, value) =>
      patchElement(content, t, { options: { gap: absentIf(value, DEFAULT_GAP) } }),
  },
]);
