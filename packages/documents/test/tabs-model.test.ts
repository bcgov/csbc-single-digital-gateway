import { describe, expect, it } from 'vitest';
import { hasErrorIn, tabDataPaths } from '../src/renderers/default/tab-errors';
import { holdsId, newTab, starterTabs, tabsOf } from '../src/renderers/ui/tabs-model';

const TABS = {
  type: 'Tabs',
  elements: [
    {
      id: 'a',
      type: 'VerticalLayout',
      label: ' Personal ',
      elements: [{ id: 'f', type: 'Control', scope: '#/properties/name' }],
    },
    { id: 'b', type: 'VerticalLayout', elements: [] },
    { id: 'x', type: 'Control', scope: '#/properties/stray' },
  ],
};

describe('tabs model (doc 272 rules 1, 3)', () => {
  it('lists the VerticalLayout children, named by label else Tab n', () => {
    expect(tabsOf(TABS).map((t) => [t.id, t.label])).toEqual([
      ['a', 'Personal'],
      ['b', 'Tab 2'],
    ]);
    expect(tabsOf({ type: 'Tabs' })).toEqual([]);
  });

  it('names a new tab with the first free Tab n and starts a Tabs with two', () => {
    expect(newTab(tabsOf(TABS))).toMatchObject({
      type: 'VerticalLayout',
      label: 'Tab 3',
      elements: [],
    });
    const starter = starterTabs();
    expect(starter.map((t) => t['label'])).toEqual(['Tab 1', 'Tab 2']);
    expect(starter[0]!['id']).not.toBe(starter[1]!['id']);
  });

  it('finds whether an element sits inside a tab', () => {
    const [first] = tabsOf(TABS);
    expect(holdsId(first!.layout, 'f')).toBe(true);
    expect(holdsId(first!.layout, 'b')).toBe(false);
  });

  it('maps a tab to its data paths and finds its errors', () => {
    const layout = {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/name' },
        { type: 'Control', scope: '#/properties/people/items/properties/first' },
      ],
    };
    const paths = tabDataPaths(layout);
    expect(paths).toEqual(['/name', '/people']);
    expect(hasErrorIn([{ instancePath: '/name', keyword: 'minLength' }], paths)).toBe(true);
    expect(hasErrorIn([{ instancePath: '/people/0/first', keyword: 'minLength' }], paths)).toBe(
      true,
    );
    expect(
      hasErrorIn(
        [{ instancePath: '', keyword: 'required', params: { missingProperty: 'name' } }],
        paths,
      ),
    ).toBe(true);
    expect(
      hasErrorIn(
        [{ instancePath: '', keyword: 'required', params: { missingProperty: 'other' } }],
        paths,
      ),
    ).toBe(false);
    expect(hasErrorIn([{ instancePath: '/names', keyword: 'type' }], paths)).toBe(false);
  });
});
