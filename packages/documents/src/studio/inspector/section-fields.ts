import {
  DEFAULT_SECTION_INSET,
  DEFAULT_SECTION_VARIANT,
  INSET_REM,
  SECTION_INSETS,
  sectionInset,
  sectionVariant,
} from '../../renderers/ui/section-model';
import {
  absentIf,
  choice,
  isKind,
  optionOf,
  patchElement,
  STRING,
  type InspectorField,
} from './inspector-field';

const isSection = isKind('section');

/** Rule 11: the inset names, titled with their size. */
const INSETS = SECTION_INSETS.map(
  (inset) => [inset, `${inset.toUpperCase()} · ${INSET_REM[inset]}rem`] as const,
);

/** Doc 278 rule 14: a Section's Title and Description. Its own keys, so a template can govern them (rule 15). */
export const SECTION_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'sectionTitle',
    section: 'General',
    label: 'Title',
    applies: isSection,
    schema: () => STRING,
    read: (t) => t.element['label'],
    write: (content, t, value) =>
      patchElement(content, t, { label: absentIf(value) as string | undefined }),
  },
  {
    key: 'sectionDescription',
    section: 'General',
    label: 'Description',
    applies: isSection,
    schema: () => STRING,
    options: { component: 'textarea' },
    read: (t) => optionOf(t, 'description'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { description: absentIf(value) } }),
  },
  {
    key: 'sectionVariant',
    section: 'Appearance',
    label: 'Variant',
    applies: isSection,
    schema: () =>
      choice([
        ['plain', 'Plain'],
        ['container', 'Container'],
      ]),
    required: true,
    // The EFFECTIVE variant; the default removes the key.
    read: (t) => sectionVariant(t.element['options']),
    write: (content, t, value) =>
      patchElement(content, t, { options: { variant: absentIf(value, DEFAULT_SECTION_VARIANT) } }),
  },
  {
    // Rule 14: absent unless the Section draws a box — a plain Section has nothing to pad.
    key: 'sectionInset',
    section: 'Appearance',
    label: 'Inset',
    applies: (t) => isSection(t) && sectionVariant(t.element['options']) === 'container',
    schema: () => choice(INSETS),
    required: true,
    read: (t) => sectionInset(t.element['options']),
    write: (content, t, value) =>
      patchElement(content, t, { options: { inset: absentIf(value, DEFAULT_SECTION_INSET) } }),
  },
] satisfies InspectorField[]);
