import { absentIf, patchElement, STRING, type InspectorField } from './inspector-field';
import type { InspectorTarget } from './inspector-target';

/** A tab: a VerticalLayout directly in a Tabs (doc 272). */
const isTab = (t: InspectorTarget) =>
  t.element['type'] === 'VerticalLayout' && t.parent?.['type'] === 'Tabs';

/** Doc 272 rule 7: a tab's name, its layout's `label`; blank removes it (the trigger then says `Tab <n>`). */
export const TABS_FIELDS: readonly InspectorField[] = Object.freeze([
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
