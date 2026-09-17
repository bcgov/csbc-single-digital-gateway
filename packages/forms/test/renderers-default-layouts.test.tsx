import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as defaults from '../src/renderers-default';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';

// Doc 193 rules 3-10 — renderers/default lays out forms with plain CSS.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, hide: { type: 'boolean' } },
};
const testerContext = { rootSchema: schema, config: {} };
const LAYOUT_TYPES = ['Grid', 'VerticalLayout', 'HorizontalLayout', 'Form'] as const;

const el = (element: object) => element as UISchemaElement;
const heading = (text: string, gridItem?: object) =>
  el({ type: 'Heading', text, ...(gridItem ? { options: { gridItem } } : {}) });
const renderers = () => [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];
const hiddenWhenSet = {
  effect: 'HIDE',
  condition: { scope: '#/properties/hide', schema: { const: true } },
};

function renderFill(uischema: object, options: { data?: object; readonly?: boolean } = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={el(uischema)}
      data={options.data ?? {}}
      renderers={renderers()}
      cells={defaults.cells}
      readonly={options.readonly ?? false}
    />,
  );
}

const layoutOf = (container: HTMLElement, type: string) =>
  container.querySelector<HTMLElement>(`[data-slot="fill-layout"][data-layout-type="${type}"]`);
const itemsOf = (layout: HTMLElement | null) =>
  Array.from(layout?.querySelectorAll<HTMLElement>(':scope > [data-slot="fill-item"]') ?? []);
const textsOf = (layout: HTMLElement | null) => itemsOf(layout).map((item) => item.textContent);

describe('fillable CSS layouts (doc 193)', () => {
  describe('set (rule 3)', () => {
    it('holds exactly one layout entry each for Grid, VerticalLayout, HorizontalLayout and Form, and no gridstack', () => {
      // Plus Flow and Stage, shown as not yet fillable (doc 195 rule 19).
      expect(defaults.layoutRenderers).toHaveLength(6);
      for (const type of LAYOUT_TYPES) {
        const matching = renderers().filter(
          (entry) => entry.tester({ type }, schema, testerContext) > 0,
        );
        expect(matching, type).toHaveLength(1);
      }
    });

    it('renders no .grid-stack or .grid-stack-item anywhere in a nested form', async () => {
      const { container } = renderFill({
        type: 'Form',
        elements: [
          {
            type: 'Grid',
            elements: [
              { type: 'HorizontalLayout', elements: [heading('Row')] },
              { type: 'VerticalLayout', elements: [heading('Stack')] },
            ],
          },
        ],
      });
      await screen.findByText('Stack');
      expect(container.querySelector('.grid-stack, .grid-stack-item')).toBeNull();
      expect(container.querySelectorAll('[data-slot="fill-layout"]')).toHaveLength(4);
    });
  });

  describe('containers and items (rules 2, 4, 9)', () => {
    it('marks each layout with data-slot fill-layout, its type and the md gap class by default', async () => {
      const { container } = renderFill({
        type: 'Form',
        elements: [
          { type: 'Grid', elements: [heading('G')] },
          { type: 'HorizontalLayout', elements: [heading('H')] },
          { type: 'VerticalLayout', elements: [heading('V')] },
        ],
      });
      await screen.findByText('V');
      for (const type of LAYOUT_TYPES) expect(layoutOf(container, type), type).toHaveClass('gap-4');
    });

    it('uses the authored gap class and ignores an unknown gap', async () => {
      const { container } = renderFill({
        type: 'Form',
        options: { gap: 'none' },
        elements: [
          { type: 'VerticalLayout', options: { gap: 'xl' }, elements: [heading('V')] },
          { type: 'HorizontalLayout', options: { gap: 'huge' }, elements: [heading('H')] },
          { type: 'Grid', options: { gap: 'xs' }, elements: [heading('G')] },
        ],
      });
      await screen.findByText('G');
      expect(layoutOf(container, 'Form')).toHaveClass('gap-0');
      expect(layoutOf(container, 'VerticalLayout')).toHaveClass('gap-8');
      expect(layoutOf(container, 'HorizontalLayout')).toHaveClass('gap-4');
      expect(layoutOf(container, 'Grid')).toHaveClass('gap-1');
    });

    it('wraps each child in a padding-free fill-item that hides when empty', async () => {
      const { container } = renderFill(
        {
          type: 'VerticalLayout',
          elements: [
            heading('Shown'),
            { type: 'VerticalLayout', rule: hiddenWhenSet, elements: [heading('Gone')] },
          ],
        },
        { data: { hide: true } },
      );
      await screen.findByText('Shown');
      const items = itemsOf(layoutOf(container, 'VerticalLayout'));
      expect(items).toHaveLength(2);
      for (const item of items) {
        expect(item).toHaveClass('min-w-0', 'empty:hidden');
        expect(item.className).not.toMatch(/(^|\s)(p|m|px|py|pt|pb|mx|my)-/);
      }
      expect(items[1]?.innerHTML).toBe('');
      expect(screen.queryByText('Gone')).toBeNull();
    });

    it('renders nothing for a layout hidden by its rule', async () => {
      const { container } = renderFill(
        { type: 'HorizontalLayout', rule: hiddenWhenSet, elements: [heading('Hidden')] },
        { data: { hide: true } },
      );
      await Promise.resolve();
      expect(container.querySelector('[data-slot="fill-layout"]')).toBeNull();
      expect(screen.queryByText('Hidden')).toBeNull();
    });

    it('passes enabled through to controls', async () => {
      renderFill(
        {
          type: 'Grid',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
        { readonly: true },
      );
      expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
    });
  });

  describe('layouts (rules 5-8)', () => {
    it('renders Form and VerticalLayout as a flex column in elements order', async () => {
      const { container } = renderFill({
        type: 'Form',
        elements: [
          heading('One'),
          { type: 'VerticalLayout', elements: [heading('Two'), heading('Three')] },
        ],
      });
      await screen.findByText('Three');
      for (const type of ['Form', 'VerticalLayout']) {
        expect(layoutOf(container, type), type).toHaveClass('flex', 'flex-col');
        expect(layoutOf(container, type), type).not.toHaveClass('grid');
      }
      expect(textsOf(layoutOf(container, 'VerticalLayout'))).toEqual(['Two', 'Three']);
    });

    it('renders a HorizontalLayout as a one-column grid that becomes its columns from sm, with width spans', async () => {
      const { container } = renderFill({
        type: 'HorizontalLayout',
        options: { columns: 4 },
        elements: [heading('Left', { w: 3 }), heading('Right')],
      });
      await screen.findByText('Right');
      const row = layoutOf(container, 'HorizontalLayout');
      expect(row).toHaveClass(
        'grid',
        'grid-cols-1',
        '@min-[40rem]/fill-page:[grid-template-columns:repeat(var(--fill-columns),minmax(0,1fr))]',
      );
      expect(row?.style.getPropertyValue('--fill-columns')).toBe('4');
      const items = itemsOf(row);
      expect(items.map((item) => item.style.getPropertyValue('--fill-column'))).toEqual([
        'span 3',
        'span 1',
      ]);
      for (const item of items)
        expect(item).toHaveClass('@min-[40rem]/fill-page:[grid-column:var(--fill-column)]');
    });

    it('renders a Grid in (y, x) order with start columns, spans and h min-heights from sm', async () => {
      const { container } = renderFill({
        type: 'Grid',
        options: { column: 6 },
        elements: [
          heading('Right', { x: 3, y: 0, w: 3 }),
          heading('Unplaced'),
          heading('Left', { x: 0, y: 0, w: 3 }),
          heading('Tall', { x: 0, y: 1, w: 6, h: 5 }),
        ],
      });
      await screen.findByText('Tall');
      const grid = layoutOf(container, 'Grid');
      expect(grid?.style.getPropertyValue('--fill-columns')).toBe('6');
      const items = itemsOf(grid);
      expect(items.map((item) => item.textContent)).toEqual(['Left', 'Right', 'Tall', 'Unplaced']);
      expect(items.map((item) => item.style.getPropertyValue('--fill-column'))).toEqual([
        '1 / span 3',
        '4 / span 3',
        '1 / span 6',
        'span 1',
      ]);
      expect(items.map((item) => item.style.minHeight)).toEqual(['', '', '5rem', '']);
    });
  });

  describe('nested Form (rule 10)', () => {
    it('renders a root Form as a fragment around its column (no <form>, no extra element)', async () => {
      const { container } = renderFill({ type: 'Form', elements: [heading('Root')] });
      await screen.findByText('Root');
      const column = layoutOf(container, 'Form');
      expect(container.querySelector('form')).toBeNull();
      // The column is the root form's only element: nothing wraps it.
      expect(column?.parentElement?.querySelectorAll(':scope > *')).toHaveLength(1);
      expect(textsOf(column)).toEqual(['Root']);
    });

    it.each(LAYOUT_TYPES)('shows the nested-Form error inside a fillable %s', async (type) => {
      renderFill({
        type,
        elements: [heading('Outer'), { type: 'Form', elements: [heading('Inner')] }],
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(NESTED_FORM_MESSAGE);
      expect(screen.getByText('Outer')).toBeInTheDocument();
      expect(screen.queryByText('Inner')).toBeNull();
    });
  });
});
