import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import {
  mdiCheckboxMarkedOutline,
  mdiCheckboxMultipleMarkedOutline,
  mdiFormatListChecks,
  mdiFormatHeaderPound,
  mdiFormDropdown,
  mdiFormTextbox,
  mdiMinus,
  mdiNumeric,
  mdiRadioboxMarked,
  mdiTextLong,
  mdiToggleSwitchOutline,
  mdiViewColumnOutline,
  mdiViewGridOutline,
  mdiViewSequentialOutline,
} from '@mdi/js';

// The palette's catalogue (doc 189 rules 16-17): every element the studio renders, grouped, with the default
// configuration it lands with. Pure — `insertElement` turns a built template into document changes.

export type PaletteGroupId = 'display' | 'layout' | 'fields';

export interface PaletteGroup {
  readonly id: PaletteGroupId;
  readonly label: string;
}

// Doc 198 rule 19: the Flow group is gone — Stages and Forms are added by the canvas + affordances, not the palette.
export const PALETTE_GROUPS: readonly PaletteGroup[] = Object.freeze([
  Object.freeze({ id: 'display', label: 'Display' }),
  Object.freeze({ id: 'layout', label: 'Layout' }),
  Object.freeze({ id: 'fields', label: 'Fields' }),
]);

/** A built template: its element, and for a field the data property it binds to (the scope is set on insert). */
export interface BuiltTemplate {
  readonly element: UISchemaElement;
  readonly property?: JsonSchema;
}

export interface PaletteTemplate {
  readonly key: string;
  readonly group: PaletteGroupId;
  readonly label: string;
  /** An `@mdi/js` icon path. */
  readonly icon: string;
  readonly keywords: readonly string[];
}

interface TemplateDefinition extends PaletteTemplate {
  /** Fresh objects on every call; `title` is a field's numbered property title (rule 17). */
  build(title: string): BuiltTemplate;
}

const element = (value: object) => value as UISchemaElement;

const choices = () => [
  { const: 'option-1', title: 'Option 1' },
  { const: 'option-2', title: 'Option 2' },
];

/** A label-less Control, with `options.component` when the field is not its type's default renderer. */
const field =
  (component: string | undefined, property: (title: string) => JsonSchema) =>
  (title: string): BuiltTemplate => ({
    element: element({ type: 'Control', ...(component ? { options: { component } } : {}) }),
    property: property(title),
  });

const DEFINITIONS: readonly TemplateDefinition[] = Object.freeze(
  (
    [
      {
        key: 'heading',
        group: 'display',
        label: 'Heading',
        icon: mdiFormatHeaderPound,
        keywords: ['title', 'text'],
        build: () => ({
          element: element({ type: 'Heading', text: 'Heading', options: { level: 2 } }),
        }),
      },
      {
        // Doc 194 rule 13: refused in a HorizontalLayout by insertElement and drag acceptance, never disabled.
        key: 'separator',
        group: 'display',
        label: 'Separator',
        icon: mdiMinus,
        keywords: ['divider', 'rule', 'line', 'hr'],
        build: () => ({ element: element({ type: 'Separator' }) }),
      },
      {
        key: 'grid',
        group: 'layout',
        label: 'Grid',
        icon: mdiViewGridOutline,
        keywords: ['columns', 'layout'],
        build: () => ({ element: element({ type: 'Grid', elements: [] }) }),
      },
      {
        key: 'vertical-layout',
        group: 'layout',
        label: 'Vertical layout',
        icon: mdiViewSequentialOutline,
        keywords: ['stack', 'column'],
        build: () => ({ element: element({ type: 'VerticalLayout', elements: [] }) }),
      },
      {
        key: 'horizontal-layout',
        group: 'layout',
        label: 'Horizontal layout',
        icon: mdiViewColumnOutline,
        keywords: ['row', 'side by side'],
        build: () => ({
          element: element({ type: 'HorizontalLayout', options: { columns: 2 }, elements: [] }),
        }),
      },
      {
        key: 'text',
        group: 'fields',
        label: 'Text',
        icon: mdiFormTextbox,
        keywords: ['input', 'string'],
        build: field(undefined, (title) => ({ type: 'string', title })),
      },
      {
        key: 'textarea',
        group: 'fields',
        label: 'Textarea',
        icon: mdiTextLong,
        keywords: ['multiline', 'paragraph'],
        build: field('textarea', (title) => ({ type: 'string', title })),
      },
      {
        key: 'number',
        group: 'fields',
        label: 'Number',
        icon: mdiNumeric,
        keywords: ['numeric', 'amount'],
        build: field(undefined, (title) => ({ type: 'number', title })),
      },
      {
        key: 'combobox',
        group: 'fields',
        label: 'Combobox',
        icon: mdiFormDropdown,
        keywords: ['select', 'dropdown', 'choice'],
        build: field(undefined, (title) => ({ type: 'string', title, oneOf: choices() })),
      },
      {
        key: 'radio-group',
        group: 'fields',
        label: 'Radio group',
        icon: mdiRadioboxMarked,
        keywords: ['choice', 'options'],
        build: field('radio-group', (title) => ({ type: 'string', title, oneOf: choices() })),
      },
      // Doc 205 rule 40: the same schema twice, differing only in `options.component` — the Combobox /
      // Radio group pair exactly. "Multiple" is DERIVED from `type: 'array'`, never an authored flag.
      {
        key: 'multi-select',
        group: 'fields',
        label: 'Multi-select',
        icon: mdiFormatListChecks,
        keywords: ['multiple', 'choice', 'options', 'tags', 'chips'],
        build: field(undefined, (title) => ({
          type: 'array',
          title,
          uniqueItems: true,
          items: { oneOf: choices() },
        })),
      },
      {
        key: 'checkbox-group',
        group: 'fields',
        label: 'Checkbox group',
        icon: mdiCheckboxMultipleMarkedOutline,
        keywords: ['multiple', 'choice', 'options', 'checkboxes'],
        build: field('checkbox-group', (title) => ({
          type: 'array',
          title,
          uniqueItems: true,
          items: { oneOf: choices() },
        })),
      },
      {
        key: 'checkbox',
        group: 'fields',
        label: 'Checkbox',
        icon: mdiCheckboxMarkedOutline,
        keywords: ['boolean', 'tick'],
        build: field(undefined, (title) => ({ type: 'boolean', title })),
      },
      {
        key: 'switch',
        group: 'fields',
        label: 'Switch',
        icon: mdiToggleSwitchOutline,
        keywords: ['boolean', 'toggle'],
        build: field('switch', (title) => ({ type: 'boolean', title })),
      },
    ] satisfies TemplateDefinition[]
  ).map((definition) => Object.freeze(definition)),
);

/** The catalogue, in palette order (rule 16). */
export const PALETTE_TEMPLATES: readonly PaletteTemplate[] = DEFINITIONS;

const byKey = new Map(DEFINITIONS.map((definition) => [definition.key, definition]));

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rule 17: `"<label> <n>"`, `n` one more than the highest number among titles exactly `"<label> <digits>"`. */
export function nextTitle(label: string, schema: JsonSchema): string {
  const pattern = new RegExp(`^${escapeRegExp(label)} (\\d+)$`);
  let highest = 0;
  for (const property of Object.values(schema.properties ?? {})) {
    const match = typeof property.title === 'string' ? pattern.exec(property.title) : null;
    const number = Number(match?.[1]);
    if (number > highest) highest = number;
  }
  return `${label} ${highest + 1}`;
}

/** The element — and for a field its property — the template `key` lands with; `undefined` for an unknown key. */
export function buildTemplate(key: string, schema: JsonSchema): BuiltTemplate | undefined {
  const definition = byKey.get(key);
  return definition?.build(nextTitle(definition.label, schema));
}
