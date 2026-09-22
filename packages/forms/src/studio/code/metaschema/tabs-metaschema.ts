import { LAYOUT_GAPS } from '../../../renderers/gridstack/layout-gap';
import { TABS_COMPONENTS } from '../../../renderers/gridstack/tabs-options';

// The Tabs's half of the uischema metaschema (doc 216 rule 13), in its own module for the reason
// `flow-metaschema.ts` has one: `uischema-metaschema.ts` is long past this repo's 300-line gate, and a new
// element type should not be what pushes it further.

// Doc 193 rule 16: the same gap scale, restated here rather than imported from a module that imports this one.
// Copied from `uischema-metaschema.ts`, not imported from it: that module imports THIS one, and the helper is
// two lines. The comment inside is doc 191 rule 11 and must survive any edit.
const whenType = <T extends object>(type: string, then: T) =>
  ({
    // No description here: Monaco shows hover text from every `if` it evaluates, matching or not, so a description on
    // the condition would label every element's "type" with the first branch's text.
    if: { properties: { type: { const: type } }, required: ['type'] },
    // eslint-disable-next-line unicorn/no-thenable -- the JSON Schema draft-07 `then` keyword; never awaited
    then,
  }) as const;

const GAP = {
  description:
    "Space between this tab's children: none 0, xs 0.25rem, sm 0.5rem, md 1rem (default), lg 1.5rem, xl 2rem.",
  enum: LAYOUT_GAPS,
} as const;

/**
 * Doc 216 rules 10, 13: a Tabs's children are Tabs and nothing else, so its `elements` point at
 * the `tab` definition rather than the general `element` one — which is also why `Tab` never joins the
 * element type enum. A tab is made by the `+`, never authored into a layout.
 */
export const TABS = whenType('Tabs', {
  required: ['elements'],
  properties: {
    elements: {
      description: 'The tabs, in order. Every child must be a Tab.',
      type: 'array',
      items: { $ref: '#/definitions/tab' },
    },
    options: {
      description: 'Tabs options.',
      type: 'object',
      properties: {
        component: {
          description:
            'How the tabs are drawn: tabs (default) is a row of tabs, list breaks them out into labelled blocks.',
          enum: TABS_COMPONENTS,
        },
      },
    },
  },
});

/** The `tab` and `tabContent` definitions, spread into the metaschema's `definitions`. */
export const TAB_DEFINITIONS = {
  /**
   * Doc 216 rule 1: one tab's TRIGGER — its name and its description — holding EXACTLY ONE `TabContent`.
   * Reachable only from a Tabs's `elements`, which is why `Tab` never joins the element type enum: a tab is
   * made by the `+`, never authored into a layout.
   *
   * `minItems`/`maxItems` of 1 is the metaschema's half of "the pair cannot desync": nesting the panel inside
   * its trigger makes a trigger without a panel unrepresentable, and this says so to the code editor too.
   */
  tab: {
    description: 'One tab of a Tabs: its name, and the content shown when it is open.',
    type: 'object',
    required: ['type', 'elements'],
    properties: {
      type: { description: 'Always Tab.', const: 'Tab' },
      label: { description: "The tab's name, shown on the tab itself.", type: 'string' },
      rule: { $ref: '#/definitions/rule' },
      elements: {
        description: "Exactly one TabContent: this tab's panel.",
        type: 'array',
        minItems: 1,
        maxItems: 1,
        items: { $ref: '#/definitions/tabContent' },
      },
      options: {
        description: 'Tab options.',
        type: 'object',
        properties: {
          // Doc 216 rules 6-8: doc 207's rich-content shape, verbatim, exactly as a Section's is. Authored
          // now and drawn later — nothing renders it yet.
          description: {
            description:
              'A description of this tab, as a Lexical editor state. Rich content, not plain text. Authored for later use; nothing shows it yet.',
            type: 'object',
            required: ['root'],
            properties: { root: { description: 'The editor state root node.', type: 'object' } },
          },
        },
      },
    },
  },
  /**
   * Doc 216 rules 1, 9-10: one tab's PANEL — a vertical layout, so it takes a VerticalLayout's elements and
   * its gap. Its children exclude a Tabs: tabs within tabs is a structure an author cannot read back. Like
   * `ROW_ELEMENTS`' Separator rule, this states the DIRECT case only — the runtime gate (`allowedInLayout`,
   * which sees the whole ancestor chain) is what refuses one nested deeper.
   */
  tabContent: {
    description: "A tab's content.",
    type: 'object',
    required: ['type', 'elements'],
    properties: {
      type: { description: 'Always TabContent.', const: 'TabContent' },
      rule: { $ref: '#/definitions/rule' },
      elements: {
        description:
          'The elements shown when this tab is open. A Tabs is not allowed inside a tab.',
        type: 'array',
        items: {
          allOf: [
            { $ref: '#/definitions/element' },
            { not: { properties: { type: { const: 'Tabs' } }, required: ['type'] } },
          ],
        },
      },
      options: {
        description: 'Panel options.',
        type: 'object',
        properties: { gap: GAP },
      },
    },
  },
} as const;
