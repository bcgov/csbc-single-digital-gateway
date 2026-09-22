import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  rankWith,
  uiTypeIs,
  type JsonSchema,
  type RankedTester,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { useContext, type ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as studio from '../src/renderers-studio';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';
import { LayoutNestingContext } from '../src/renderers/gridstack/layout-nesting';
import { TabsOverrideProvider, hasTabs } from '../src/renderers/gridstack/tabs-options';
import { TabsEditorProvider, type TabsEditor } from '../src/renderers/gridstack/tabs-editor';
import { PLAIN_CONFIG } from '../src/renderers/ui/control-presentation';

// Doc 216 rules 2-4, 24-33 — the ONE shared `Tabs` renderer: which body the sanitised component picks, the
// structure it draws, the nesting context it provides, and the component traps rules 25-27 work around.
//
// Rendered through the real registries and the real <JsonForms>, like every other renderer test: the point of
// rule 4 is that the SAME tester picks this renderer in both sets, so dispatch is never stubbed.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, city: { type: 'string', title: 'City' } },
};
const testerContext = { rootSchema: schema, config: {} };

const el = (element: object) => element as UISchemaElement;
const heading = (text: string) => ({ type: 'Heading', text });
const control = (property: string) => ({ type: 'Control', scope: `#/properties/${property}` });

/** A `Tab` is the TRIGGER; its single `TabContent` is what the panel dispatches (rule 2). */
const tab = (label: string | undefined, elements: object[] = []) => ({
  type: 'Tab',
  ...(label === undefined ? {} : { label }),
  elements: [{ type: 'TabContent', elements }],
});

const tabs = (children: object[], options?: object) => ({
  type: 'Tabs',
  ...(options ? { options } : {}),
  elements: children,
});

const formRoot = (elements: object[]) => el({ type: 'Form', elements });

/**
 * A probe with a tester above every layout entry, so it can be dropped anywhere a layout renders children and
 * report the `LayoutNestingContext` it sees (rule 24). A component, not an inline arrow — it reads a hook.
 */
function NestingProbe() {
  const kind = useContext(LayoutNestingContext);
  return <span data-testid="nesting">{kind ?? 'null'}</span>;
}
const probeEntry: { tester: RankedTester; renderer: () => ReactNode } = {
  tester: rankWith(10, uiTypeIs('NestingProbe')),
  renderer: NestingProbe,
};
const probe = { type: 'NestingProbe' };

const renderFill = (uischema: object, options: { config?: unknown } = {}) =>
  render(
    <JsonForms
      schema={schema}
      uischema={el(uischema)}
      data={{}}
      renderers={[
        ...defaults.controlRenderers,
        ...defaults.displayRenderers,
        ...defaults.layoutRenderers,
        probeEntry,
      ]}
      cells={defaults.cells}
      {...(options.config === undefined ? {} : { config: options.config })}
      validationMode="NoValidation"
    />,
  );

const tabsNode = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="tabs"]');
const listBody = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="tabs"][data-component="list"]');

/** A `TabsEditor` that only has to exist: rules 15 and 20 are about what the STRIP draws under one. */
const stubEditor: TabsEditor = {
  idOf: (element) => `id-${String((element as { label?: unknown }).label ?? 'tabs')}`,
  onGesture: () => {},
  openTabId: () => undefined,
};

describe('dispatch (rules 3-4, 28)', () => {
  it('renders tabs for a Tabs with no options.component', () => {
    const { container } = renderFill(formRoot([tabs([tab('One'), tab('Two')])]));

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(listBody(container)).toBeNull();
  });

  it('renders tabs for an explicit component of tabs', () => {
    const { container } = renderFill(
      formRoot([tabs([tab('One'), tab('Two')], { component: 'tabs' })]),
    );

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(listBody(container)).toBeNull();
  });

  it('renders tabs for an unknown or wrong-typed component rather than nothing', () => {
    // Rule 3, the sanitiser rule of doc 182: what is not understood reads as the DEFAULT, never `undefined`.
    for (const component of ['accordion', 42, null] as const) {
      const { container, unmount } = renderFill(formRoot([tabs([tab('One')], { component })]));
      expect(screen.getByRole('tablist'), String(component)).toBeInTheDocument();
      expect(listBody(container), String(component)).toBeNull();
      unmount();
    }
  });

  it('renders the broken-out blocks for an authored component of list (rule 28)', () => {
    const { container } = renderFill(
      formRoot([
        tabs([tab('One', [heading('First')]), tab('Two', [heading('Second')])], {
          component: 'list',
        }),
      ]),
    );

    // Rule 28: no tab row at all, and EVERY tab's content visible at once, in `elements` order.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(listBody(container)).toBeInTheDocument();
    expect(
      [...container.querySelectorAll('[data-slot="tab-block"]')].map((block) => block.textContent),
    ).toEqual(['OneFirst', 'TwoSecond']);
  });

  it('registers exactly one Tabs entry per renderer set — no tie at the top rank', () => {
    // Rule 4: ONE entry at rank 1 on the bare type in each set, dispatching on the component itself. A second
    // entry at the same rank would be resolved by JSONForms taking whichever was spread FIRST.
    for (const [name, set] of [
      ['default', defaults.layoutRenderers],
      ['studio', studio.layoutRenderers],
    ] as const) {
      const ranks = set
        .map((entry) => entry.tester(el({ type: 'Tabs' }), schema, testerContext))
        .filter((rank) => rank > 0);
      expect(ranks, name).toEqual([1]);

      // Rule 2: a Tab is the trigger and is NEVER dispatched, so it has no entry at all; its TabContent has one.
      expect(
        set.filter((entry) => entry.tester(el({ type: 'Tab' }), schema, testerContext) > 0),
        name,
      ).toHaveLength(0);
      expect(
        set.filter((entry) => entry.tester(el({ type: 'TabContent' }), schema, testerContext) > 0),
        name,
      ).toHaveLength(1);
    }
  });
});

describe('structure (rule 2)', () => {
  it('renders one trigger and one panel per Tab, paired by value', () => {
    renderFill(formRoot([tabs([tab('One', [heading('First')]), tab('Two', [heading('Second')])])]));

    const triggers = screen.getAllByRole('tab');
    expect(triggers).toHaveLength(2);
    // Base UI mounts only the OPEN panel, and links it to its trigger by id — that pairing is what makes the
    // panel below the strip the one the selected trigger names.
    const panel = screen.getByRole('tabpanel');
    expect(triggers[0]).toHaveAttribute('aria-selected', 'true');
    expect(triggers[0]?.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel).toHaveTextContent('First');
    expect(panel).not.toHaveTextContent('Second');
  });

  it('labels each trigger with the Tab label, and leaves an unlabelled Tab blank', () => {
    renderFill(formRoot([tabs([tab('Personal details'), tab('Contact'), tab(undefined)])]));

    expect(screen.getAllByRole('tab').map((trigger) => trigger.textContent)).toEqual([
      'Personal details',
      'Contact',
      '',
    ]);
  });

  it('renders a Tabs with no Tab children without throwing', () => {
    const { container } = renderFill(formRoot([tabs([])]));

    expect(tabsNode(container)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });

  it('draws only Tab children as tabs, and an empty panel for a Tab with no TabContent', () => {
    // Rule 2: a document the metaschema would refuse is still a document someone has to open.
    const { container } = renderFill(
      formRoot([tabs([{ type: 'Tab', label: 'Bare' }, heading('Stray')])]),
    );

    expect(screen.getAllByRole('tab').map((trigger) => trigger.textContent)).toEqual(['Bare']);
    expect(screen.getByRole('tabpanel').textContent).toBe('');
    expect(tabsNode(container)).not.toHaveTextContent('Stray');
  });
});

describe('preview override (rules 31-32)', () => {
  const renderWithOverride = (uischema: object, component: 'tabs' | 'list', config?: unknown) =>
    render(
      <TabsOverrideProvider value={component}>
        <JsonForms
          schema={schema}
          uischema={el(uischema)}
          data={{}}
          renderers={[
            ...defaults.controlRenderers,
            ...defaults.displayRenderers,
            ...defaults.layoutRenderers,
          ]}
          cells={defaults.cells}
          {...(config === undefined ? {} : { config })}
          validationMode="NoValidation"
        />
      </TabsOverrideProvider>,
    );

  it('forces the list body over an authored tabs, without the document changing', () => {
    const uischema = formRoot([tabs([tab('One'), tab('Two')], { component: 'tabs' })]);
    const { container } = renderWithOverride(uischema, 'list');

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(listBody(container)).toBeInTheDocument();
    // Rule 31: the override is a way of LOOKING at the form, so the element it was applied to is untouched.
    expect(uischema).toMatchObject({
      elements: [{ type: 'Tabs', options: { component: 'tabs' } }],
    });
  });

  it('forces the tabs body over an authored list', () => {
    const { container } = renderWithOverride(
      formRoot([tabs([tab('One'), tab('Two')], { component: 'list' })]),
      'tabs',
    );

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(listBody(container)).toBeNull();
  });

  it('draws the authored component where no provider stands above the form', () => {
    // Rule 32: `null` — the value everywhere but a preview — means "as authored", not "as tabs".
    const { container } = renderFill(formRoot([tabs([tab('One')], { component: 'list' })]));

    expect(listBody(container)).toBeInTheDocument();
  });

  it('is itself outranked by plain presentation (rules 22, 29)', () => {
    const { container } = renderWithOverride(
      formRoot([tabs([tab('One'), tab('Two')], { component: 'tabs' })]),
      'tabs',
      PLAIN_CONFIG,
    );

    // A review page that hid most of its answers behind tabs would defeat doc 214, whatever anyone forced.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(listBody(container)).toBeInTheDocument();
  });

  it('finds a Tabs anywhere below an element, which is what shows the picker (rule 33)', () => {
    expect(hasTabs(formRoot([tabs([tab('One')])]))).toBe(true);
    expect(hasTabs(formRoot([{ type: 'Section', elements: [tabs([tab('One')])] }]))).toBe(true);
    expect(hasTabs(formRoot([heading('Only a heading')]))).toBe(false);
    expect(hasTabs(undefined)).toBe(false);
  });
});

describe('nesting context (rule 24)', () => {
  it('provides LayoutNestingContext of vertical inside a Tab panel', () => {
    renderFill(formRoot([tabs([tab('One', [probe])])]));

    expect(screen.getByTestId('nesting')).toHaveTextContent('vertical');
  });

  it('provides it in the list body too, so the two presentations agree', () => {
    renderFill(formRoot([tabs([tab('One', [probe])], { component: 'list' })]));

    expect(screen.getByTestId('nesting')).toHaveTextContent('vertical');
  });

  it('reports a Form inside a tab panel as nested', () => {
    // Without a nesting context a Form believes it is the root; rule 24 is what makes doc 192's check work here.
    renderFill(formRoot([tabs([tab('One', [{ type: 'Form', elements: [heading('Inner')] }])])]));

    expect(screen.getByText(NESTED_FORM_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('Inner')).toBeNull();
  });
});

describe('component traps (rules 25-27)', () => {
  const renderEditable = (uischema: object) =>
    render(
      <TabsEditorProvider value={stubEditor}>
        <JsonForms
          schema={schema}
          uischema={el(uischema)}
          data={{}}
          renderers={[
            ...defaults.controlRenderers,
            ...defaults.displayRenderers,
            ...defaults.layoutRenderers,
          ]}
          cells={defaults.cells}
          validationMode="NoValidation"
        />
      </TabsEditorProvider>,
    );

  it('resets the panel font size rather than inheriting TabsContent text-xs', () => {
    renderFill(formRoot([tabs([tab('One', [control('name')])])]));

    // Rule 25: `@repo/ui` base styles size bare `p`, `li` and `h1`-`h6` ON the element, which beats anything
    // INHERITED — so a panel that kept `text-xs/relaxed` would render at two sizes at once.
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveClass('text-[length:inherit]', 'leading-[inherit]');
    expect(panel.className).not.toMatch(/(^|\s)text-xs(\/|\s|$)/);
  });

  it('keeps the + outside TabsList so the list alone scrolls', () => {
    const { container } = renderEditable(formRoot([tabs([tab('One'), tab('Two')])]));

    const strip = container.querySelector<HTMLElement>('[data-slot="tab-strip"]');
    const list = container.querySelector<HTMLElement>('[data-slot="tabs-list"]');
    const add = container.querySelector<HTMLElement>('[data-slot="tab-strip-add"]');
    expect(add).toBeInTheDocument();
    // Rule 15: the `+` is a SIBLING of the list — inside it, it would scroll away with the tabs, and would be a
    // non-tab child of a `tablist`.
    expect(list?.contains(add ?? null)).toBe(false);
    expect(add?.parentElement).toBe(strip);
    expect(list).toHaveClass('overflow-x-auto', 'min-w-0');
    expect(add).toHaveClass('shrink-0');
  });

  it('hides the scrollbar and shows no edge shadow until the row overflows (rule 15c)', () => {
    const { container } = renderEditable(formRoot([tabs([tab('One'), tab('Two')])]));
    const list = screen.getByRole('tablist');

    // `no-scrollbar` is the design system's own utility (combobox, command, sidebar use it) rather than a
    // second hand-rolled one.
    expect(list).toHaveClass('no-scrollbar', 'overflow-x-auto');
    // The shadows stand in for the hidden scrollbar, so they must not appear when there is nothing to scroll.
    // jsdom reports every width as 0, so this is the only half of rule 15c a test can see — a real overflow
    // and the shadow following the scroll position are hand-verified.
    expect(container.querySelector('[data-slot="tab-strip-shadow-start"]')).toBeNull();
    expect(container.querySelector('[data-slot="tab-strip-shadow-end"]')).toBeNull();
  });

  it('gives triggers flex-none against TabsTrigger flex-1, and left-aligns them', () => {
    renderEditable(formRoot([tabs([tab('One'), tab('Two')])]));

    for (const trigger of screen.getAllByRole('tab')) {
      /**
       * Rule 15b. This assertion USED to require `flex-1` and `shrink-0` together, reasoning that they are
       * different class groups so both survive `cn()` — which is true, and is exactly why the tabs stretched:
       * `shrink-0` sets `flex-shrink`, leaving `flex-grow: 1` from `flex-1` untouched. `flex-none` is in the
       * SAME group as `flex-1`, so tailwind-merge drops `flex-1` outright and a tab is as wide as its name.
       */
      expect(trigger).toHaveClass('flex-none', 'shrink-0', 'justify-start');
      expect(trigger).not.toHaveClass('flex-1');
      // Rule 20: a Tabs may sit in a gridstack item, whose draggable would otherwise claim the press.
      expect(trigger).toHaveClass('nodrag', 'pointer-events-auto');
    }
  });

  it('leaves packages/ui tabs.tsx unchanged — every adjustment is a className', () => {
    // Rule 27: the vendored shadcn component is untouched, so no `gen:entries -w @repo/ui` run is owed. Pinned by
    // the two things rules 15 and 25 work around still being IN it: were they gone, the workarounds would be dead
    // code, and were the file edited for this feature it would say so.
    const source = readFileSync(
      resolve(import.meta.dirname, '../../ui/src/components/ui/tabs.tsx'),
      'utf8',
    );
    expect(source).toMatch(/text-xs\/relaxed/);
    expect(source).toMatch(/flex-1/);
    expect(source).toMatch(/inline-flex w-fit/);
    expect(source).not.toMatch(/216|Tabs element|doc 21[0-9]/);
  });
});
