import { JsonForms } from '@jsonforms/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import {
  convertTabs,
  newTab,
  tabsLayout,
  tabsOf,
  type TabsLayout,
} from '../src/renderers/ui/tabs-model';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { form } from './funnel-fixtures';
import { renderStudioRenderers } from './render-studio-renderers';

const SCHEMA = {
  type: 'object',
  properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } },
};
const control = (id: string, key: string, gridItem?: object) => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
  ...(gridItem !== undefined && { options: { gridItem } }),
});
const tabs = (options?: Record<string, unknown>, first: Uischema[] = [control('ca', 'a')]) => ({
  id: 'T',
  type: 'Tabs',
  ...(options !== undefined && { options }),
  elements: [
    { id: 't1', type: 'VerticalLayout', label: 'One', options: { gap: 'lg' }, elements: first },
    { id: 't2', type: 'VerticalLayout', label: 'Two', elements: [] },
  ],
});
const page = (element: Uischema) => form('F', 'Page', [element]);
const convert = (elements: readonly unknown[], layout: TabsLayout) =>
  convertTabs(elements, layout) as Uischema[];
const contentWith = (element: Uischema): DocumentContent => ({
  schema: SCHEMA,
  variants: { default: page(element) },
});
const targetOf = (content: DocumentContent, id = 'T') =>
  inspectorTarget(content, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
const apply = (content: DocumentContent, values: Record<string, unknown>) => {
  const target = targetOf(content);
  return applyInspector(content, target, { ...inspectorForm(target).data, ...values });
};

describe('tabs layout model (doc 272 rules 11-12, 14, 16)', () => {
  it('reads the layout: absent or unknown is vertical', () => {
    expect(tabsLayout(undefined)).toBe('vertical');
    expect(tabsLayout({ layout: 'card' })).toBe('card');
    expect(tabsLayout({ layout: 'grid' })).toBe('grid');
    expect(tabsLayout({ layout: 'horizontal' })).toBe('horizontal');
    expect(tabsLayout({ layout: 'Card' })).toBe('vertical');
    expect(tabsLayout('card')).toBe('vertical');
  });

  it('accepts a Grid or HorizontalLayout as a tab, whatever the setting', () => {
    const mixed = {
      type: 'Tabs',
      elements: [
        { id: 'g', type: 'Grid', label: 'G', elements: [] },
        { id: 'h', type: 'HorizontalLayout', elements: [] },
        { id: 'x', type: 'Control', scope: '#/properties/a' },
      ],
    };
    expect(tabsOf(mixed).map((t) => [t.id, t.label])).toEqual([
      ['g', 'G'],
      ['h', 'Tab 2'],
    ]);
  });

  it('converts to grid in reading order, keeping ids, labels and gap; nothing deleted', () => {
    const many = [0, 1, 2, 3, 4].map((i) => control(`c${i}`, 'a'));
    const [one, two] = convert(tabs(undefined, many).elements, 'grid');
    expect(one).toMatchObject({
      id: 't1',
      type: 'Grid',
      label: 'One',
      options: { gap: 'lg', columns: 2, rows: 3 },
    });
    expect((one!['elements'] as Uischema[]).map((c) => [c['id'], c['options']])).toEqual([
      ['c0', { gridItem: { x: 0, y: 0 } }],
      ['c1', { gridItem: { x: 1, y: 0 } }],
      ['c2', { gridItem: { x: 0, y: 1 } }],
      ['c3', { gridItem: { x: 1, y: 1 } }],
      ['c4', { gridItem: { x: 0, y: 2 } }],
    ]);
    expect(two).toMatchObject({ id: 't2', type: 'Grid', options: { columns: 2, rows: 2 } });
  });

  it('caps a converted grid at 24 rows', () => {
    const many = Array.from({ length: 60 }, (_, i) => control(`c${i}`, 'a'));
    const [one] = convert(tabs(undefined, many).elements, 'grid');
    expect((one!['options'] as Record<string, unknown>)['rows']).toBe(24);
    expect(one!['elements']).toHaveLength(60);
  });

  it('converts to horizontal or vertical, dropping placement and type-specific options', () => {
    const grid = {
      id: 't1',
      type: 'Grid',
      label: 'One',
      options: { columns: 3, rows: 2, gap: 'sm', alignItems: 'center' },
      elements: [
        control('c0', 'a', { x: 2, y: 1, w: 1 }),
        { ...control('c1', 'b'), options: { gridItem: { x: 0, y: 0 }, size: 'sm' } },
      ],
    };
    const [row] = convert([grid], 'horizontal');
    expect(row).toEqual({
      id: 't1',
      type: 'HorizontalLayout',
      label: 'One',
      options: { gap: 'sm' },
      elements: [
        { id: 'c0', type: 'Control', scope: '#/properties/a' },
        { id: 'c1', type: 'Control', scope: '#/properties/b', options: { size: 'sm' } },
      ],
    });
    const [column] = convert([row!], 'vertical');
    expect(column).toMatchObject({ type: 'VerticalLayout', options: { gap: 'sm' } });
    const [carded] = convert([column!], 'card');
    expect(carded).toEqual(column);
  });

  it('leaves non-tab children of the Tabs alone', () => {
    const stray = { id: 'x', type: 'Control', scope: '#/properties/a' };
    expect(convert([stray], 'grid')).toEqual([stray]);
  });

  it('adds a tab of the container the layout calls for', () => {
    const existing = tabsOf(tabs());
    expect(newTab(existing, 'vertical')).toMatchObject({ type: 'VerticalLayout', label: 'Tab 3' });
    expect(newTab(existing, 'card')).toMatchObject({ type: 'VerticalLayout' });
    expect(newTab(existing, 'horizontal')).toMatchObject({ type: 'HorizontalLayout' });
    expect(newTab(existing, 'grid')).toMatchObject({
      type: 'Grid',
      options: { columns: 2, rows: 2 },
      elements: [],
    });
  });
});

describe('tabs layout — default renderer (doc 272 rules 13, 17)', () => {
  const renderTabs = (element: Uischema) =>
    render(
      <JsonForms
        schema={SCHEMA}
        uischema={page(element) as never}
        data={{}}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );

  it('frames each panel in a Card for card, and not otherwise', () => {
    const carded = renderTabs(tabs({ layout: 'card' }));
    const panel = screen.getByRole('tabpanel');
    const frame = panel.querySelector('[data-slot="tab-card"]')!;
    expect(frame).toHaveAttribute('data-slot', 'tab-card');
    expect(frame.querySelector('[data-slot="tab-body"]')).toContainElement(
      screen.getByRole('textbox', { name: 'A' }),
    );
    expect(panel.querySelector('[data-slot="card-header"]')).toBeNull();
    carded.unmount();
    renderTabs(tabs());
    expect(screen.getByRole('tabpanel').querySelector('[data-slot="tab-card"]')).toBeNull();
    expect(screen.getByRole('tabpanel').querySelector('[data-slot="tab-body"]')).not.toBeNull();
  });

  it('dispatches a Grid tab as a grid', () => {
    const [grid, second] = convert(tabs().elements, 'grid');
    renderTabs({ id: 'T', type: 'Tabs', options: { layout: 'grid' }, elements: [grid, second] });
    expect(screen.getByRole('tab', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'A' })).toBeInTheDocument();
  });
});

describe('tabs layout — studio (doc 272 rules 13, 16)', () => {
  it('frames the panels in a Card for card', () => {
    const { container } = renderStudioRenderers(page(tabs({ layout: 'card' })), { schema: SCHEMA });
    const studioTabs = container.querySelector<HTMLElement>('[data-element-id="T"]')!;
    const panels = within(studioTabs).getAllByRole('tabpanel', { hidden: true });
    for (const panel of panels) {
      expect(panel.querySelector('[data-slot="tab-card"] [data-slot="tab-body"]')).not.toBeNull();
    }
  });

  it('adds a Grid tab to a grid Tabs', async () => {
    const user = userEvent.setup();
    const element = {
      id: 'T',
      type: 'Tabs',
      options: { layout: 'grid' },
      elements: convert(tabs().elements, 'grid'),
    };
    const { update } = renderStudioRenderers(page(element), { schema: SCHEMA });
    await user.click(screen.getByRole('button', { name: 'Add tab' }));
    const [id, patch] = update.mock.calls.at(-1)!;
    expect(id).toBe('T');
    expect(patch.elements![2]).toMatchObject({
      type: 'Grid',
      label: 'Tab 3',
      options: { columns: 2, rows: 2 },
    });
  });
});

describe('tabs layout — inspector and palette (doc 272 rules 8, 15-16)', () => {
  it('offers Layout in Appearance, its choices sorted alphabetically, reading vertical when unset', () => {
    const target = targetOf(contentWith(tabs()));
    const field = fieldsFor(target).find((f) => f.key === 'tabsLayout')!;
    expect(field).toMatchObject({ section: 'Appearance', label: 'Layout', required: true });
    const { schema, data } = inspectorForm(target);
    const choices = (
      schema as { properties: Record<string, { oneOf: { const: string; title: string }[] }> }
    ).properties['tabsLayout']!.oneOf;
    expect(choices.map((c) => c.title)).toEqual([
      'Card',
      'Grid',
      'Horizontal layout',
      'Vertical layout',
    ]);
    expect(choices.map((c) => c.const)).toEqual(['card', 'grid', 'horizontal', 'vertical']);
    expect(data['tabsLayout']).toBe('vertical');
  });

  it('switching to grid writes the option and converts every tab in one edit', () => {
    const next = apply(contentWith(tabs()), { tabsLayout: 'grid' });
    const written = findById(next.variants.default, 'T')!;
    expect(written['options']).toEqual({ layout: 'grid' });
    const elements = written['elements'] as Uischema[];
    expect(elements.map((e) => [e['id'], e['type']])).toEqual([
      ['t1', 'Grid'],
      ['t2', 'Grid'],
    ]);
    expect(findById(next.variants.default, 'ca')).toMatchObject({
      options: { gridItem: { x: 0, y: 0 } },
    });
  });

  it('switching back to vertical removes the key; card ↔ vertical changes only the option', () => {
    const carded = apply(contentWith(tabs()), { tabsLayout: 'card' });
    const cardTabs = findById(carded.variants.default, 'T')!;
    expect(cardTabs['options']).toEqual({ layout: 'card' });
    expect(cardTabs['elements']).toEqual(tabs().elements);
    const back = apply(carded, { tabsLayout: 'vertical' });
    expect(findById(back.variants.default, 'T')!['options']).not.toHaveProperty('layout');
  });

  it('keeps the Tab label field on a Grid or row tab', () => {
    const element = {
      id: 'T',
      type: 'Tabs',
      options: { layout: 'grid' },
      elements: convert(tabs().elements, 'grid'),
    };
    const keys = fieldsFor(targetOf(contentWith(element), 't1')).map((f) => f.key);
    expect(keys).toContain('tabLabel');
    expect(keys).toContain('columns');
  });

  it('creates new Tabs as card', () => {
    const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'tabs')!;
    expect(item.create().element).toMatchObject({ type: 'Tabs', options: { layout: 'card' } });
  });
});
