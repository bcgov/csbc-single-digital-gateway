import { tabsVariant } from '../../renderers/ui/tabs-model';
import { absentIf, choice, patchElement, STRING, type InspectorField } from './inspector-field';
import type { InspectorTarget } from './inspector-target';

/** A tab: a VerticalLayout directly in a Tabs (doc 272). */
const isTab = (t: InspectorTarget) =>
  t.element['type'] === 'VerticalLayout' && t.parent?.['type'] === 'Tabs';

/** Doc 272 rule 7: a tab's name, its layout's `label`; blank removes it (the trigger then says `Tab <n>`). */
export const TABS_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    // Doc 272 rule 9: the strip's look — `@repo/ui` TabsList's variants; Default writes nothing.
    key: 'tabsVariant',
    section: 'Appearance',
    label: 'Variant',
    applies: (t) => t.kind === 'tabs',
    schema: () =>
      choice([
        ['default', 'Default'],
        ['line', 'Line'],
      ]),
    required: true,
    read: (t) => tabsVariant(t.element),
    write: (content, t, value) =>
      patchElement(content, t, { options: { variant: value === 'line' ? 'line' : undefined } }),
  },
  {
    key: 'tabLabel',
    section: 'General',
    label: 'Tab label',
    applies: isTab,
    schema: () => STRING,
    read: (t) => t.element['label'],
    write: (content, t, value) =>
      patchElement(content, t, { label: absentIf(value) as string | undefined }),
  },
]);
