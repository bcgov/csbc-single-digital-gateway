import {
  convertTabs,
  DEFAULT_TABS_LAYOUT,
  TABS_LAYOUTS,
  tabsLayout,
  type TabsLayout,
} from '../../renderers/ui/tabs-model';
import {
  absentIf,
  choice,
  isKind,
  patchElement,
  STRING,
  type InspectorField,
} from './inspector-field';
import type { InspectorTarget } from './inspector-target';

/** The container types a tab may be (doc 272 rule 12). */
const TAB_TYPES: ReadonlySet<unknown> = new Set(['VerticalLayout', 'HorizontalLayout', 'Grid']);

/** A tab: a tab container directly in a Tabs (doc 272 rules 7, 16). */
const isTab = (t: InspectorTarget) =>
  TAB_TYPES.has(t.element['type']) && t.parent?.['type'] === 'Tabs';

export const TABS_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    // Doc 272 rule 7: a tab's name, its layout's `label`; blank removes it (the trigger then says `Tab <n>`).
    key: 'tabLabel',
    section: 'General',
    label: 'Tab label',
    applies: isTab,
    schema: () => STRING,
    read: (t) => t.element['label'],
    write: (content, t, value) =>
      patchElement(content, t, { label: absentIf(value) as string | undefined }),
  },
  {
    // Doc 272 rules 14-15: the option and every converted tab, in ONE edit; vertical (the default) is an absent key.
    key: 'tabsLayout',
    section: 'Appearance',
    label: 'Layout',
    applies: isKind('tabs'),
    schema: () => choice(TABS_LAYOUTS),
    required: true,
    read: (t) => tabsLayout(t.element['options']),
    write: (content, t, value) => {
      const layout = tabsLayout({ layout: value });
      if (layout === tabsLayout(t.element['options'])) return content;
      const elements = (t.element['elements'] as unknown[] | undefined) ?? [];
      return patchElement(content, t, {
        options: { layout: absentIf(layout, DEFAULT_TABS_LAYOUT) as TabsLayout | undefined },
        elements: convertTabs(elements, layout),
      });
    },
  },
]);
