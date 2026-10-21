import {
  TABS_COMPONENTS,
  DEFAULT_TABS_COMPONENT,
  tabsComponentOf,
} from '../../renderers/gridstack/tabs-options';
import { TABS_TYPE, TAB_TYPE } from '../../renderers/gridstack/grid-layouts';
import { richTextIsEmpty, richTextValue } from '../../renderers/ui/rich-text-value';
import type { InspectorContext } from './inspector-context';
import { optionsOf, setElement, withOption } from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// A Tab's own settings (doc 216 rules 6-7), in their own module for the reason `section-fields.ts` has one:
// `inspector-fields.ts` sits at the 300-line gate.
//
// Label and Gap are NOT here. Both apply to anything with a layout kind, and a Tab has one
// (`KIND_BY_TYPE`), so a tab's name and its panel's spacing arrive with no new field — which is the whole point
// of registering Tab as a second type of an existing kind rather than as a kind of its own.
//
// Rule 34: the Tabs's Component picker is HERE, not in `control-components.ts`. That module is keyed
// by `ControlKind` because it answers a CONTROL's question; a layout's has nothing to do with the schema type a
// field binds to. Two fields both labelled "Component", never both applying — the same separation
// `tabDescription` keeps from a bound property's `description`.

const isTab = (ctx: InspectorContext) => ctx.element.type === TAB_TYPE;

/** Rules 3, 28: the two shapes, titled for the picker. */
const COMPONENT_TITLES: Readonly<Record<(typeof TABS_COMPONENTS)[number], string>> = Object.freeze({
  tabs: 'Tabs',
  list: 'List',
});

/** Rule 8: the wording of a value that is authored now and drawn later. */
export const TAB_DESCRIPTION_PLACEHOLDER = 'Describe this tab';

export const TAB_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    /**
     * Rule 34: how the Tabs draws — a row of tabs, or the tabs broken out as labelled blocks.
     *
     * It shows the EFFECTIVE component, so the field says what the element IS rather than what it was authored
     * with, and the default REMOVES the option — the rule the Gap and Variant fields already follow, so an
     * element set back to its default is indistinguishable from one that never left it.
     *
     * A preview override (rule 31) is deliberately invisible here: it changes no document, and an inspector
     * field that reported it would be showing a value the author cannot save.
     */
    key: 'tabsComponent',
    section: 'appearance',
    label: 'Component',
    applies: (ctx) => ctx.element.type === TABS_TYPE,
    schema: () => ({
      type: 'string',
      oneOf: TABS_COMPONENTS.map((value) => ({
        const: value,
        title: COMPONENT_TITLES[value],
      })),
    }),
    read: (ctx) => tabsComponentOf(optionsOf(ctx.element)),
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(edit.element, 'component', value === DEFAULT_TABS_COMPONENT ? undefined : value),
      ),
  },
  {
    /**
     * Rules 6-8: rich content, stored at `options.description` — the same shape and the same reader a Section's
     * and a Form's description use, so the value means one thing everywhere it appears rather than three.
     *
     * `tabDescription`, not `description`: that key is a bound property's Description field, and one key
     * names one inspector value (doc 207's reason for `formDescription`, doc 212's for `sectionDescription`).
     *
     * NOTHING RENDERS IT YET (rule 8, user decision 2026-09-22). The leading candidate is a tooltip on the tab
     * trigger; a tab strip has no room for a second line, and the value is worth authoring before it is worth
     * drawing. The field SCHEMA is what dispatches the rich text control (doc 207 rule 31).
     */
    key: 'tabDescription',
    section: 'general',
    label: 'Description',
    applies: isTab,
    schema: () => ({
      type: 'object',
      required: ['root'],
      description: 'Authored for later use; nothing shows it yet.',
    }),
    options: () => ({ placeholder: TAB_DESCRIPTION_PLACEHOLDER }),
    read: (ctx) => richTextValue(optionsOf(ctx.element)['description']),
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withOption(
          edit.element,
          'description',
          richTextIsEmpty(richTextValue(value)) ? undefined : value,
        ),
      ),
  },
] satisfies InspectorField[]);
