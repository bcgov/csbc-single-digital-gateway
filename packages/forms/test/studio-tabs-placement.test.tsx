import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { GridEditor } from '../src/renderers/gridstack/grid-editor';
import {
  allowedInLayout,
  GRID_LAYOUT_TYPES,
  isGridLayoutType,
  layoutKindOf,
  TABS_TYPE,
  TAB_CONTENT_TYPE,
  TAB_TYPE,
} from '../src/renderers/gridstack/grid-layouts';
import { TABS_COMPONENTS } from '../src/renderers/gridstack/tabs-options';
import { TABS, TAB_DEFINITIONS } from '../src/studio/code/metaschema/tabs-metaschema';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import { insertElement } from '../src/studio/layout/insert-element';
import { useStudioDocument } from '../src/studio/use-studio-document';

// Doc 216 rules 9-13 — where a Tabs, a Tab and a TabContent may sit, enforced once in
// `allowedInLayout` and restated by the metaschema, exactly as doc 212 does for a Section.

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;
const noKey = () => 'unused';
const KINDS = ['vertical', 'horizontal', 'grid'] as const;

/** Doc 201 rule 15: a Form's title is required, so every Form fixture carries one. */
// Doc 219: fixtures carry ids so seed normalisation is a no-op and the studio holds these exact objects.
let fixtureId = 0;
const nextId = () => `fx-${(fixtureId += 1)}`;
const formOf = (...elements: object[]) =>
  el({ type: 'Form', id: nextId(), label: 'Untitled form', elements });
const tabOf = (label: string, panel: object) => ({
  type: 'Tab',
  id: nextId(),
  label,
  elements: [panel],
});
const tabsOf = (...elements: object[]) => ({ type: 'Tabs', id: nextId(), elements });
const ajv = createAjv();
const validate = ajv.compile(UISCHEMA_METASCHEMA);
const uischemaOk = (uischema: unknown) => validate(uischema) === true;

/**
 * A Form holding a row, a Grid, a bare VerticalLayout, and two Tabs — the second so a move INTO the
 * first one's panel is a genuine ancestry refusal and not the "target is inside the moved element" one.
 * `panelStack` is a VerticalLayout inside a TabContent: identical in kind to `stack`, and the whole point
 * of rule 11.
 */
// Doc 219: every element carries an id, so seed normalisation is a NO-OP and the studio holds these exact
// objects — which is what lets the tests below hand `editor.idOf` a fixture element and get its studio id.
function fixture() {
  const stack = el({ type: 'VerticalLayout', id: 'stack-1', elements: [] });
  const row = el({
    type: 'HorizontalLayout',
    id: 'row-1',
    options: { columns: 2 },
    elements: [],
  });
  const grid = el({ type: 'Grid', id: 'grid-1', elements: [] });
  const panelStack = el({ type: 'VerticalLayout', id: 'panelstack-1', elements: [] });
  const panel = el({ type: 'TabContent', id: 'panel-1', elements: [panelStack] });
  const firstTab = tabOf('Tab 1', panel);
  const strip = el({ type: 'Tabs', id: 'strip-1', elements: [firstTab] });
  const other = el({
    type: 'Tabs',
    id: 'other-1',
    elements: [tabOf('Tab 1', { type: 'TabContent', id: 'otherpanel-1', elements: [] })],
  });
  const root = formOf(stack, row, grid, strip, other);
  const ids = createElementIds();
  return { stack, row, grid, panelStack, panel, firstTab, strip, other, root, ids };
}

describe('allowedInLayout — Tabs (rules 9, 11)', () => {
  it('allows a Tabs in a vertical kind', () => {
    // A Form, a Service, a VerticalLayout, a Section and a TabContent all report `vertical`.
    expect(allowedInLayout(TABS_TYPE, 'vertical')).toBe(true);
  });

  it('refuses a Tabs in a grid and in a horizontal layout', () => {
    // Rule 9, doc 212 rule 4's reasoning: a tab strip in one column of a row is unusable.
    expect(allowedInLayout(TABS_TYPE, 'grid')).toBe(false);
    expect(allowedInLayout(TABS_TYPE, 'horizontal')).toBe(false);
  });

  it('refuses a Tabs whose ancestors include a TabContent', () => {
    // Rule 9's second half: tabs within tabs is a structure an author cannot read back.
    expect(
      allowedInLayout(TABS_TYPE, 'vertical', ['Form', TABS_TYPE, TAB_TYPE, TAB_CONTENT_TYPE]),
    ).toBe(false);
  });

  it('refuses it through an intermediate VerticalLayout inside a TabContent — ancestry, not parent', () => {
    // A parent-only check would allow a Tabs through this exact hole: the parent's kind is `vertical`,
    // indistinguishable from a bare VerticalLayout's.
    const ancestors = ['Form', TABS_TYPE, TAB_TYPE, TAB_CONTENT_TYPE, 'VerticalLayout'];
    expect(allowedInLayout(TABS_TYPE, 'vertical', ancestors)).toBe(false);
    expect(allowedInLayout(TABS_TYPE, 'vertical', ['Form', 'VerticalLayout'])).toBe(true);
  });

  it('checks only the kind rules when ancestors is omitted', () => {
    // The argument is optional so a caller asking a pure kind question (`review-document`) still means
    // what it says — and an empty chain must behave the same as an absent one.
    expect(allowedInLayout(TABS_TYPE, 'vertical')).toBe(true);
    expect(allowedInLayout(TABS_TYPE, 'vertical', [])).toBe(true);
    // Every other element's placement is unchanged by the widening.
    expect(allowedInLayout('Heading', 'grid', ['Form', TAB_CONTENT_TYPE])).toBe(true);
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
  });
});

describe('allowedInLayout — Tab and TabContent (rule 10)', () => {
  it('refuses a Tab and a TabContent in every layout kind', () => {
    // `NEVER_IN_LAYOUT`, for the same reason a Stage is refused everywhere: both are made by the `+`
    // alone, inside their Tabs, and no drag may take one out of the strip.
    for (const kind of KINDS) {
      expect(allowedInLayout(TAB_TYPE, kind), kind).toBe(false);
      expect(allowedInLayout(TAB_CONTENT_TYPE, kind), kind).toBe(false);
      // Not even inside their own Tabs, which is the one place they are legal in a document.
      expect(allowedInLayout(TAB_TYPE, kind, [TABS_TYPE]), kind).toBe(false);
    }
  });
});

describe('the three production gates pass ancestors (rule 11)', () => {
  it('insertElement refuses a Tabs into a layout inside a Tab but allows it outside', () => {
    const f = fixture();
    const document = { schema, uischema: f.root };

    const refused = insertElement(
      document,
      'tabs',
      { gridId: f.ids.idOf(f.panelStack) },
      f.ids,
      noKey,
    );
    expect(refused.inserted).toBeUndefined();
    expect(refused.uischema).toBe(f.root);

    // The same insert into the identical-kind VerticalLayout outside the strip is accepted, so the
    // refusal above is ancestry and not a kind rule quietly refusing everything.
    const allowed = insertElement(document, 'tabs', { gridId: f.ids.idOf(f.stack) }, f.ids, noKey);
    expect(allowed.inserted?.type).toBe(TABS_TYPE);
  });

  it('applyMove refuses the same move', () => {
    const f = fixture();
    const move = (toGridId: string) => ({
      elementId: f.ids.idOf(f.other),
      fromGridId: f.ids.idOf(f.root),
      toGridId,
      fromNodes: [],
      toNodes: [],
    });

    // Doc 194: refusing only in write-back would leave gridstack's DOM moved — a ghost item.
    expect(applyMove(f.root, move(f.ids.idOf(f.panelStack)), f.ids)).toBe(f.root);
    expect(applyMove(f.root, move(f.ids.idOf(f.panel)), f.ids)).toBe(f.root);
    expect(applyMove(f.root, move(f.ids.idOf(f.stack)), f.ids)).not.toBe(f.root);
  });

  it('the editor accepts callback refuses the same drop, given the layout id', () => {
    const f = fixture();
    const { result } = renderHook(() => useStudioDocument({ schema, uischema: f.root }));
    const editor: GridEditor = result.current.editor;
    const accepts = editor.accepts;
    expect(accepts).toBeTypeOf('function');

    const panelStackId = editor.idOf(f.panelStack);
    const stackId = editor.idOf(f.stack);
    // Doc 216 rule 12: the LAYOUT'S ID travels, because ancestry cannot be asked of the kind alone.
    expect(accepts?.('vertical', { template: 'tabs' }, panelStackId)).toBe(false);
    expect(accepts?.('vertical', { elementId: editor.idOf(f.other) }, panelStackId)).toBe(false);
    expect(accepts?.('vertical', { template: 'tabs' }, stackId)).toBe(true);
    expect(accepts?.('vertical', { elementId: editor.idOf(f.other) }, stackId)).toBe(true);
    // An unknown source still passes, and a Tab is refused wherever it is dragged.
    expect(accepts?.('vertical', { template: 'unknown' }, stackId)).toBe(true);
    expect(accepts?.('vertical', { elementId: editor.idOf(f.firstTab) }, stackId)).toBe(false);
  });
});

describe('kind registration (rule 1)', () => {
  it('registers TabContent in KIND_BY_TYPE as vertical, so it is a drop target and not inert', () => {
    // That one entry buys the inspector's Gap field, the gridstack options, the delete wording and
    // every `layoutKindOf` branch in insert/move/copy, with no new machinery.
    expect(layoutKindOf(TAB_CONTENT_TYPE)).toBe('vertical');
    // `studio-content.tsx` locks anything that is not a grid layout type, which would freeze the panel.
    expect(isGridLayoutType(TAB_CONTENT_TYPE)).toBe(true);
  });

  it('leaves GRID_LAYOUT_TYPES one type per kind — VerticalLayout undisplaced', () => {
    // One type per kind there; the map is read by the axis testers and by `fill-layouts`, so a second
    // vertical entry would DISPLACE VerticalLayout and nothing would type-check the difference.
    expect(GRID_LAYOUT_TYPES.vertical).toBe('VerticalLayout');
    expect(Object.values(GRID_LAYOUT_TYPES)).not.toContain(TAB_CONTENT_TYPE);
    expect(Object.values(GRID_LAYOUT_TYPES)).not.toContain(TABS_TYPE);
    expect(Object.values(GRID_LAYOUT_TYPES)).not.toContain(TAB_TYPE);
  });

  it('does not register Tabs or Tab as a layout kind', () => {
    // A Tabs's children are Tabs made by the `+`, so it is never a drop target and has no gap of its
    // own; a Tab is a trigger holding one panel, not a place to put fields.
    expect(layoutKindOf(TABS_TYPE)).toBeUndefined();
    expect(layoutKindOf(TAB_TYPE)).toBeUndefined();
    expect(isGridLayoutType(TABS_TYPE)).toBe(false);
    expect(isGridLayoutType(TAB_TYPE)).toBe(false);
  });
});

describe('metaschema (rule 13)', () => {
  const element = UISCHEMA_METASCHEMA.definitions?.['element'] as unknown as {
    properties: { type: { enum: readonly string[] } };
    allOf: readonly { if: unknown }[];
  };

  it('lists Tabs in the element type enum and Tab nowhere in it', () => {
    expect(element.properties.type.enum).toContain(TABS_TYPE);
    expect(element.properties.type.enum).not.toContain(TAB_TYPE);
    expect(element.properties.type.enum).not.toContain(TAB_CONTENT_TYPE);
    // So a Tab authored straight into a layout is refused by the code editor too.
    expect(uischemaOk(formOf(tabOf('Tab 1', { type: 'TabContent', elements: [] })))).toBe(false);
    expect(uischemaOk(formOf({ type: 'TabContent', elements: [] }))).toBe(false);
  });

  it('reaches Tab only through the Tabs branch elements ref, and TabContent only through Tab', () => {
    expect(TABS.then.properties.elements.items).toEqual({ $ref: '#/definitions/tab' });
    expect(UISCHEMA_METASCHEMA.definitions?.['tab']).toBe(TAB_DEFINITIONS.tab);
    expect(UISCHEMA_METASCHEMA.definitions?.['tabContent']).toBe(TAB_DEFINITIONS.tabContent);
    // Rule 16's other half: a Tab holds EXACTLY ONE TabContent, so a trigger with no panel — or with
    // two — is unrepresentable rather than merely unwritten.
    expect(TAB_DEFINITIONS.tab.properties.elements).toMatchObject({
      minItems: 1,
      maxItems: 1,
      items: { $ref: '#/definitions/tabContent' },
    });

    const panel = { type: 'TabContent', elements: [] };
    expect(uischemaOk(formOf(tabsOf(tabOf('Tab 1', panel))))).toBe(true);
    expect(uischemaOk(formOf(tabsOf({ type: 'Tab', label: 'No panel', elements: [] })))).toBe(
      false,
    );
    expect(
      uischemaOk(formOf(tabsOf({ type: 'Tab', label: 'Two', elements: [panel, panel] }))),
    ).toBe(false);
    expect(uischemaOk(formOf(tabsOf({ type: 'Heading', text: 'Not a tab' })))).toBe(false);
    expect(
      uischemaOk(formOf(tabsOf(tabOf('Tab 1', { type: 'VerticalLayout', elements: [] })))),
    ).toBe(false);

    // Rules 9-10 restated: a Tabs in a row or a Grid, or directly inside a panel, is refused.
    expect(
      uischemaOk(
        formOf({ type: 'HorizontalLayout', options: { columns: 2 }, elements: [tabsOf()] }),
      ),
    ).toBe(false);
    expect(uischemaOk(formOf({ type: 'Grid', elements: [tabsOf()] }))).toBe(false);
    expect(
      uischemaOk(formOf(tabsOf(tabOf('Tab 1', { type: 'TabContent', elements: [tabsOf()] })))),
    ).toBe(false);
    // A panel takes ordinary elements, and a Tab may carry a rich description (rules 6-8).
    expect(
      uischemaOk(
        formOf(
          tabsOf({
            type: 'Tab',
            label: 'Contact',
            options: { description: { root: {} } },
            elements: [
              {
                type: 'TabContent',
                options: { gap: 'lg' },
                elements: [{ type: 'Heading', text: 'One' }],
              },
            ],
          }),
        ),
      ),
    ).toBe(true);
  });

  it('declares the options.component enum and carries no description on the if', () => {
    expect(TABS.then.properties.options.properties.component.enum).toEqual(TABS_COMPONENTS);
    expect(uischemaOk(formOf({ type: 'Tabs', options: { component: 'list' }, elements: [] }))).toBe(
      true,
    );
    expect(
      uischemaOk(formOf({ type: 'Tabs', options: { component: 'accordion' }, elements: [] })),
    ).toBe(false);
    // Doc 191 rule 11: Monaco shows hover text from every `if` it evaluates, matching or not.
    expect(JSON.stringify(TABS.if)).not.toContain('description');
    for (const branch of element.allOf)
      expect(JSON.stringify(branch.if)).not.toContain('description');
  });
});
