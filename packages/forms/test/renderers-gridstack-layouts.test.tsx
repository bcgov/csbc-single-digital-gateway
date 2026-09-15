import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { GridStack, type GridHTMLElement } from 'gridstack';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers-default';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as studio from '../src/renderers-studio';
import {
  horizontalColumns,
  horizontalWidth,
  isGridLayoutType,
  layoutKindOf,
} from '../src/renderers/gridstack/grid-layouts';
import { buildGridStackOptions } from '../src/renderers/gridstack/grid-options';

// Doc 180 rules 23-30 — VerticalLayout and HorizontalLayout in renderers/gridstack.

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
const testerContext = { rootSchema: schema, config: {} };
const LAYOUT_TYPES = ['Grid', 'VerticalLayout', 'HorizontalLayout'] as const;

const heading = (text: string, gridItem?: object) =>
  ({ type: 'Heading', text, ...(gridItem ? { options: { gridItem } } : {}) }) as UISchemaElement;
const nameControl = { type: 'Control', scope: '#/properties/name' } as UISchemaElement;

const build = (input: Partial<Parameters<typeof buildGridStackOptions>[0]> = {}) =>
  buildGridStackOptions({
    elements: [],
    elementOptions: undefined,
    gridOptions: undefined,
    idPrefix: 'g',
    ...input,
  });

const placements = (options: ReturnType<typeof build>) =>
  options.children?.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));

type Set = typeof defaults;

const renderersOf = (set: Set) => [
  ...set.controlRenderers,
  ...set.displayRenderers,
  ...set.layoutRenderers,
];

function renderWith(set: Set, uischema: object) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={renderersOf(set)}
      cells={set.cells}
    />,
  );
}

const rootOf = (container: HTMLElement) => container.querySelector<GridHTMLElement>('.grid-stack');

/** The root grid's engine nodes in reading order, with the text each item shows. */
const nodesOf = (container: HTMLElement) =>
  (rootOf(container)?.gridstack?.engine.nodes ?? [])
    .map((node) => ({ text: node.el?.textContent, x: node.x, y: node.y, w: node.w }))
    .toSorted((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));

const itemOf = (container: HTMLElement, type: string) =>
  container
    .querySelector(`[data-slot="studio-grid-item"][data-element-type="${type}"]`)
    ?.closest<HTMLElement>('.grid-stack-item');

/** The `.grid-stack-item` holding the heading named `text`. */
const itemHolding = (text: string) =>
  screen.getByRole('heading', { name: text }).closest('.grid-stack-item');

/** The resize handle sides gridstack rendered directly on an item, e.g. `ui-resizable-se`. */
const handleSides = (item: HTMLElement | null | undefined) =>
  Array.from(item?.querySelectorAll(':scope > .ui-resizable-handle') ?? []).map((handle) =>
    [...handle.classList].find((c) => /^ui-resizable-(n|e|s|w|ne|nw|se|sw)$/.test(c)),
  );

async function settle(text: string) {
  await screen.findByRole('heading', { name: text });
  await act(async () => {});
}

describe('layout kinds (rules 23-24)', () => {
  it('maps each gridstack layout type to its kind and nothing else', () => {
    expect(layoutKindOf('Grid')).toBe('grid');
    expect(layoutKindOf('VerticalLayout')).toBe('vertical');
    expect(layoutKindOf('HorizontalLayout')).toBe('horizontal');
    expect(layoutKindOf('Group')).toBeUndefined();
    expect(LAYOUT_TYPES.every(isGridLayoutType)).toBe(true);
    expect(isGridLayoutType('Heading')).toBe(false);
  });

  it('returns Grid, VerticalLayout and HorizontalLayout entries, each ranking 1 for its own type only', () => {
    const entries = createGridRenderers().layoutRenderers;
    // Plus the root Form entry last (doc 192 rule 2, tested in renderers-gridstack-form.test.tsx).
    expect(entries).toHaveLength(4);
    LAYOUT_TYPES.forEach((type, index) => {
      for (const other of [...LAYOUT_TYPES, 'Form', 'Heading']) {
        const rank = entries[index]?.tester({ type: other }, schema, testerContext);
        expect(rank, `${type} tester on ${other}`).toBe(other === type ? 1 : NOT_APPLICABLE);
      }
    });
  });

  it('holds exactly one entry per layout type in both default and studio', () => {
    for (const set of [defaults, studio]) {
      for (const type of LAYOUT_TYPES) {
        const matching = renderersOf(set).filter(
          (entry) => entry.tester({ type }, schema, testerContext) > 0,
        );
        expect(matching, type).toHaveLength(1);
      }
    }
  });
});

describe('VerticalLayout options (rule 25)', () => {
  it('forces one column, no resizing and no row cap over factory and authored options', () => {
    const options = build({
      layout: 'vertical',
      gridOptions: { staticGrid: false, column: 6, disableResize: false, maxRow: 4 },
      elementOptions: { column: 4, maxRow: 10, cellHeight: 80, float: true },
    });
    expect(options).toMatchObject({
      column: 1,
      disableResize: true,
      maxRow: 0,
      staticGrid: false,
      cellHeight: '1rem',
      margin: '0.5rem',
      sizeToContent: false,
    });
    expect(options.float).toBeUndefined();
  });
});

describe('VerticalLayout placement (rule 26)', () => {
  it('stacks children in element order, ignoring every authored gridItem key', () => {
    const elements = [heading('A', { x: 3, y: 9, w: 6, h: 4 }), heading('B'), nameControl];
    expect(placements(build({ layout: 'vertical', elements }))).toEqual([
      { id: 'g-0', x: 0, y: 0, w: 1 },
      { id: 'g-1', x: 0, y: 1, w: 1 },
      { id: 'g-2', x: 0, y: 2, w: 1 },
    ]);
  });

  it('stacks by the current engine heights and carries them as h', () => {
    const elements = [heading('A'), heading('B'), heading('C')];
    const currentHeights = new Map([
      ['g-0', 5],
      ['g-1', 3],
    ]);
    expect(placements(build({ layout: 'vertical', elements, currentHeights }))).toEqual([
      { id: 'g-0', x: 0, y: 0, w: 1, h: 5 },
      { id: 'g-1', x: 0, y: 5, w: 1, h: 3 },
      { id: 'g-2', x: 0, y: 8, w: 1 },
    ]);
  });
});

describe('HorizontalLayout columns and widths (rules 27-28)', () => {
  it('takes authored columns 2-6, else the child count clamped to 2-6', () => {
    expect(horizontalColumns({ columns: 4 }, 2)).toBe(4);
    expect(horizontalColumns({ columns: 2 }, 5)).toBe(2);
    expect(horizontalColumns({ columns: 6 }, 1)).toBe(6);
    expect(horizontalColumns({ columns: 7 }, 3)).toBe(3);
    expect(horizontalColumns({ columns: 1 }, 1)).toBe(2);
    expect(horizontalColumns({ columns: 2.5 }, 9)).toBe(6);
    expect(horizontalColumns({ columns: '3' }, 5)).toBe(5);
    expect(horizontalColumns(undefined, 0)).toBe(2);
    expect(horizontalColumns(null, 4)).toBe(4);
  });

  it('reads a child width from gridItem.w, clamped to 1..columns, else 1', () => {
    expect(horizontalWidth(heading('A', { w: 3 }), 4)).toBe(3);
    expect(horizontalWidth(heading('A', { w: 9 }), 4)).toBe(4);
    expect(horizontalWidth(heading('A', { w: 0 }), 4)).toBe(1);
    expect(horizontalWidth(heading('A', { w: 1.5 }), 4)).toBe(1);
    expect(horizontalWidth(heading('A', { w: '2' }), 4)).toBe(1);
    expect(horizontalWidth(heading('A'), 4)).toBe(1);
  });
});

describe('HorizontalLayout options and placement (rules 27-28)', () => {
  // Bug B3: no row cap — gridstack's maxRow counts 1rem grid rows and clamps item heights to it.
  it('places children left to right in one row with no row cap, ignoring other authored keys', () => {
    const elements = [
      heading('A', { x: 9, y: 4, w: 2, h: 7 }),
      heading('B'),
      heading('C', { w: 3 }),
    ];
    const options = build({
      layout: 'horizontal',
      elements,
      gridOptions: { column: 12, maxRow: 8 },
      elementOptions: { columns: 6, column: 12, maxRow: 3, float: true },
    });
    expect(options).toMatchObject({ column: 6, maxRow: 0 });
    expect(options.float).toBeUndefined();
    expect(placements(options)).toEqual([
      { id: 'g-0', x: 0, y: 0, w: 2 },
      { id: 'g-1', x: 2, y: 0, w: 1 },
      { id: 'g-2', x: 3, y: 0, w: 3 },
    ]);
  });

  it('defaults the columns to the child count and always emits maxRow: 0', () => {
    const options = build({
      layout: 'horizontal',
      elements: [heading('A'), heading('B'), heading('C')],
    });
    expect(options.column).toBe(3);
    expect(options.maxRow).toBe(0);
  });

  it('gives a child that would end past the last column no x/y, so gridstack places it', () => {
    const options = build({
      layout: 'horizontal',
      elements: [heading('A', { w: 2 }), heading('B', { w: 2 })],
      elementOptions: { columns: 3 },
    });
    expect(options.maxRow).toBe(0);
    const [first, overflow] = options.children ?? [];
    expect(first).toMatchObject({ x: 0, y: 0, w: 2 });
    expect(overflow).toMatchObject({ id: 'g-1', w: 2 });
    expect(overflow).not.toHaveProperty('x');
    expect(overflow).not.toHaveProperty('y');
  });

  it('carries the current engine heights as h', () => {
    const options = build({
      layout: 'horizontal',
      elements: [heading('A'), heading('B', { h: 9 })],
      currentHeights: new Map([['g-1', 4]]),
    });
    expect(placements(options)).toEqual([
      { id: 'g-0', x: 0, y: 0, w: 1 },
      { id: 'g-1', x: 1, y: 0, w: 1, h: 4 },
    ]);
  });

  it('leaves a Grid without layout-forced keys', () => {
    expect(build()).not.toHaveProperty('maxRow');
    expect(build()).not.toHaveProperty('disableResize');
  });
});

// Doc 193 rule 3: renderers/default no longer uses gridstack, so rules 24-29 run through a static factory set.
const staticGridSet: Set = {
  cells: defaults.cells,
  controlRenderers: defaults.controlRenderers,
  displayRenderers: defaults.displayRenderers,
  layoutRenderers: createGridRenderers().layoutRenderers,
};

describe('rendering in a static gridstack set (rules 24-29)', () => {
  it('renders a VerticalLayout as a static one-column grid stacked in element order', async () => {
    const { container } = renderWith(staticGridSet, {
      type: 'VerticalLayout',
      elements: [heading('First', { x: 4, w: 6 }), heading('Second')],
    });
    await settle('Second');

    const opts = rootOf(container)?.gridstack?.opts;
    expect(opts?.column).toBe(1);
    expect(opts?.staticGrid).toBe(true);
    const nodes = nodesOf(container);
    expect(nodes.map((node) => node.text)).toEqual(['First', 'Second']);
    expect(nodes.every((node) => node.x === 0 && node.w === 1)).toBe(true);
  });

  it('renders a HorizontalLayout as one row of its authored columns in element order', async () => {
    const { container } = renderWith(staticGridSet, {
      type: 'HorizontalLayout',
      options: { columns: 4 },
      elements: [heading('Left', { w: 3 }), heading('Right')],
    });
    await settle('Right');

    const opts = rootOf(container)?.gridstack?.opts;
    expect(opts?.column).toBe(4);
    expect(opts?.maxRow).toBe(0);
    expect(nodesOf(container)).toEqual([
      { text: 'Left', x: 0, y: 0, w: 3 },
      { text: 'Right', x: 3, y: 0, w: 1 },
    ]);
  });

  it('fits an item with a hand-set height to its content inside a layout, but not inside a Grid (rule 29)', async () => {
    const resizeToContent = vi.spyOn(GridStack.prototype, 'resizeToContent');
    renderWith(staticGridSet, {
      type: 'Grid',
      elements: [
        heading('In grid', { h: 6 }),
        { type: 'VerticalLayout', elements: [heading('In layout', { h: 6 })] },
      ],
    });
    await settle('In layout');

    expect(resizeToContent).toHaveBeenCalledWith(itemHolding('In layout'));
    expect(resizeToContent).not.toHaveBeenCalledWith(itemHolding('In grid'));
    resizeToContent.mockRestore();
  });
});

describe('studio (rules 17c, 30)', () => {
  it('gives every item in a HorizontalLayout left/right handles, Headings included', async () => {
    const { container } = renderWith(studio, {
      type: 'HorizontalLayout',
      options: { columns: 4 },
      elements: [heading('Title'), nameControl],
    });
    await settle('Title');

    for (const type of ['Heading', 'Control']) {
      const item = itemOf(container, type);
      expect(item, type).toHaveAttribute('gs-resize-handles', 'e, w');
      expect(handleSides(item).toSorted(), type).toEqual(['ui-resizable-e', 'ui-resizable-w']);
    }
  });

  it('gives items in a VerticalLayout no resize handles, with resizing disabled on the grid', async () => {
    const { container } = renderWith(studio, {
      type: 'VerticalLayout',
      elements: [heading('Title'), nameControl],
    });
    await settle('Title');

    expect(rootOf(container)?.gridstack?.opts.disableResize).toBe(true);
    expect(rootOf(container)?.gridstack?.opts.staticGrid).toBe(false);
    for (const type of ['Heading', 'Control']) {
      const item = itemOf(container, type);
      // gridstack keeps a draggable item's handle elements when resizing is disabled, and hides them
      // with `.ui-resizable-disabled > .ui-resizable-handle { display: none }` (gridstack.css).
      expect(item, type).toHaveClass('ui-resizable-disabled');
      expect(item, type).not.toHaveAttribute('gs-resize-handles');
      expect(item, type).not.toHaveClass('ui-draggable-disabled');
    }
  });

  it('keeps resizing enabled for items in a HorizontalLayout', async () => {
    const { container } = renderWith(studio, {
      type: 'HorizontalLayout',
      elements: [heading('Title')],
    });
    await settle('Title');

    expect(itemOf(container, 'Heading')).not.toHaveClass('ui-resizable-disabled');
  });

  it('never makes a layout inert, while the elements inside it are', async () => {
    const { container } = renderWith(studio, {
      type: 'Grid',
      elements: [
        { type: 'VerticalLayout', elements: [heading('Stacked')] },
        { type: 'HorizontalLayout', elements: [heading('Side')] },
      ],
    });
    await settle('Side');

    for (const type of ['VerticalLayout', 'HorizontalLayout']) {
      const content = container.querySelector(
        `[data-slot="studio-grid-item"][data-element-type="${type}"] [data-slot="studio-content"]`,
      );
      expect(content, type).not.toBeNull();
      expect(content, type).not.toHaveAttribute('inert');
      expect(content, type).not.toHaveClass('pointer-events-none');
    }
    expect(screen.getByRole('heading', { name: 'Side' }).closest('[inert]')).not.toBeNull();
  });
});
