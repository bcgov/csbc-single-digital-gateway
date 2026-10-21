import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { withoutAuthoredIds } from './without-ids';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TABS_COMPONENT,
  hasTabs,
  TABS_COMPONENTS,
  tabsComponentOf,
} from '../src/renderers/gridstack/tabs-options';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { removeElement } from '../src/studio/layout/remove-element';
import { addTab, reorderTabs } from '../src/studio/layout/tabs-edits';

// Doc 216 rules 16, 18, 19, 28, 33 — the pure document edits behind the tab strip's affordances.
// Pure modules are tested directly (doc 182's rule), never through <JsonForms>.

const schema: JsonSchema = { type: 'object', properties: {} };
const tree = (element: object) => element as TreeElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const tab = (label: string, elements: object[] = []) => ({
  type: 'Tab',
  label,
  elements: [{ type: 'TabContent', elements }],
});
const tabs = (...elements: object[]) => tree({ type: 'Tabs', elements });
/** Doc 201 rule 15: a Form's title is required, so every Form fixture carries one. */
const formOf = (...elements: object[]) => tree({ type: 'Form', label: 'Untitled form', elements });

const elementsOf = (element: UISchemaElement | undefined) =>
  (element as TreeElement | undefined)?.elements ?? [];
const labelsOf = (element: UISchemaElement | undefined) =>
  elementsOf(element).map((child) => (child as { label?: unknown }).label);

function fixture() {
  const first = tab('Tab 1', [control('aaaaaaaa')]);
  const second = tab('Tab 2');
  const third = tab('Tab 3');
  const strip = tabs(first, second, third);
  const stack = tree({ type: 'VerticalLayout', elements: [] });
  const root = formOf(strip, stack);
  const ids = createElementIds();
  return { first, second, third, strip, stack, root, ids };
}

describe('addTab (rule 16)', () => {
  it('appends a Tab with its own TabContent in one edit', () => {
    // Rule 16: the trigger and its panel arrive together, so the strip is never in a state where a
    // trigger has no panel behind it — and there is one undo, not two.
    const ids = createElementIds();
    const root = tabs();
    const { uischema } = addTab(root, ids.idOf(root), ids);

    const added = elementsOf(uischema)[0];
    expect(withoutAuthoredIds(added)).toEqual({
      type: 'Tab',
      label: 'Tab 1',
      elements: [{ type: 'TabContent', elements: [] }],
    });
    // No authored options and no id: a Tab is addressed by its place in `elements` (rule 19).
    expect((added as { options?: unknown }).options).toBeUndefined();
  });

  it('numbers the new tab against that strip and appends it at the end', () => {
    const { strip, root, ids } = fixture();
    const { uischema } = addTab(root, ids.idOf(strip), ids);

    const nextStrip = elementsOf(uischema)[0];
    expect(labelsOf(nextStrip)).toEqual(['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4']);
    // The untouched sibling keeps identity — every edit here is pure.
    expect(elementsOf(uischema)[1]).toBe(elementsOf(root)[1]);
  });

  it('returns the new Tab so the gesture can select it', () => {
    const { strip, root, ids } = fixture();
    const { uischema, inserted } = addTab(root, ids.idOf(strip), ids);

    expect(inserted).toBeDefined();
    // The SAME object that is in the returned document, so `ids.idOf(inserted)` is the new tab's id.
    expect(elementsOf(elementsOf(uischema)[0]).at(-1)).toBe(inserted);
    expect(ids.idOf(inserted as object)).toBe(
      ids.idOf(elementsOf(elementsOf(uischema)[0]).at(-1) as object),
    );
  });

  it('returns the same document when the target is not a Tabs', () => {
    const { stack, root, ids } = fixture();

    // A refused edit returns the SAME uischema, so the studio neither re-renders nor pushes an undo.
    expect(addTab(root, ids.idOf(stack), ids)).toEqual({ uischema: root, inserted: undefined });
    expect(addTab(root, ids.idOf(stack), ids).uischema).toBe(root);
    expect(addTab(root, 'el-unknown', ids).uischema).toBe(root);
    expect(addTab(root, 'el-unknown', ids).inserted).toBeUndefined();
  });
});

describe('removing a tab (rule 18)', () => {
  // There is deliberately NO `removeTab`: `removeElement` already takes any element out of its
  // parent's `elements` and reclaims the data properties its Controls used, and a Tab is an ordinary
  // selectable element. A second implementation here would be a second set of bugs.
  it('removeElement takes the Tab, its TabContent and its contents out of the strip', () => {
    const { first, strip, root, ids } = fixture();
    const document = {
      schema: { type: 'object', properties: { aaaaaaaa: { type: 'string' } } } as JsonSchema,
      uischema: root,
    };

    const result = removeElement(document, ids.idOf(first), ids);

    const nextStrip = elementsOf(result.uischema)[0];
    expect(labelsOf(nextStrip)).toEqual(['Tab 2', 'Tab 3']);
    expect(elementsOf(strip)).toHaveLength(3);
    // Rule 18 goes through the ordinary delete, so the panel's data property is reclaimed with it.
    expect(result.schema.properties?.['aaaaaaaa']).toBeUndefined();
  });

  it('leaves a Tabs with no elements when the last Tab goes — a valid state, not a throw', () => {
    const ids = createElementIds();
    const only = tab('Tab 1');
    const strip = tabs(only);
    const root = formOf(strip);

    const result = removeElement({ schema, uischema: root }, ids.idOf(only), ids);

    const nextStrip = elementsOf(result.uischema)[0];
    expect(nextStrip?.type).toBe('Tabs');
    expect(elementsOf(nextStrip)).toEqual([]);
    // And the empty strip can be filled again from the `+` with no repair step.
    const refilled = addTab(result.uischema, ids.idOf(nextStrip as object), ids);
    expect(labelsOf(elementsOf(refilled.uischema)[0])).toEqual(['Tab 1']);
  });
});

describe('reorderTabs (rule 19)', () => {
  it('writes elements order and nothing else — no authored coordinates', () => {
    const { first, second, third, strip, root, ids } = fixture();

    const next = reorderTabs(root, ids.idOf(strip), 2, 0, ids);

    const nextStrip = elementsOf(next)[0];
    expect(labelsOf(nextStrip)).toEqual(['Tab 3', 'Tab 1', 'Tab 2']);
    // Placement in a Tabs is ORDER (doc 180 rule 23): the moved tab object itself is untouched, so its
    // subtree and every studio id below it survive the move, and no `gridItem` is written.
    expect(elementsOf(nextStrip)).toEqual([third, first, second]);
    expect(elementsOf(nextStrip)[0]).toBe(third);
    for (const moved of elementsOf(nextStrip))
      expect(
        (moved as { options?: Record<string, unknown> }).options?.['gridItem'],
      ).toBeUndefined();
  });

  it('returns the same document for a no-op, an out-of-range index and a non-Tabs id', () => {
    const { stack, strip, root, ids } = fixture();
    const stripId = ids.idOf(strip);

    expect(reorderTabs(root, stripId, 1, 1, ids)).toBe(root);
    expect(reorderTabs(root, stripId, 3, 0, ids)).toBe(root);
    expect(reorderTabs(root, stripId, 0, -1, ids)).toBe(root);
    expect(reorderTabs(root, stripId, 0.5, 1, ids)).toBe(root);
    expect(reorderTabs(root, ids.idOf(stack), 0, 1, ids)).toBe(root);
    expect(reorderTabs(root, 'el-unknown', 0, 1, ids)).toBe(root);
  });
});

describe('tabsComponentOf (rules 3, 28)', () => {
  it('offers exactly two components, tabs being the default', () => {
    expect(TABS_COMPONENTS).toEqual(['tabs', 'list']);
    expect(DEFAULT_TABS_COMPONENT).toBe('tabs');
  });

  it('defaults to tabs for absent options', () => {
    expect(tabsComponentOf(undefined)).toBe('tabs');
    expect(tabsComponentOf({})).toBe('tabs');
  });

  it('reads the authored list component (rule 28)', () => {
    expect(tabsComponentOf({ component: 'list' })).toBe('list');
  });

  it('ignores a wrong-typed or unknown component and still returns tabs', () => {
    // Doc 182's sanitiser rule: what is not understood becomes the default, never `undefined`.
    for (const component of [7, null, ['list'], { component: 'list' }, 'accordion', 'List'])
      expect(tabsComponentOf({ component }), JSON.stringify(component)).toBe('tabs');
    expect(tabsComponentOf('list')).toBe('tabs');
    expect(tabsComponentOf(null)).toBe('tabs');
  });
});

describe('hasTabs (rule 33)', () => {
  // What decides whether the preview shows its Tabs / List picker: a control that cannot change
  // what is on screen is worse than no control.
  it('is true for a Tabs and for one nested deep in a document', () => {
    expect(hasTabs(tabs())).toBe(true);
    expect(
      hasTabs(
        formOf({ type: 'VerticalLayout', elements: [{ type: 'Section', elements: [tabs()] }] }),
      ),
    ).toBe(true);
  });

  it('is false for a document without one, and for a non-object', () => {
    expect(
      hasTabs(formOf(control('aaaaaaaa'), { type: 'Grid', elements: [control('bbbbbbbb')] })),
    ).toBe(false);
    expect(hasTabs(undefined)).toBe(false);
    expect(hasTabs('Tabs')).toBe(false);
    expect(hasTabs([tabs()])).toBe(false);
  });
});
