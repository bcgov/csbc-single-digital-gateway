import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { GridStack, type GridHTMLElement, type GridStackNode } from 'gridstack';
import { describe, expect, it, vi } from 'vitest';
import {
  createGridRenderers,
  GridEditorProvider,
  type GridEditor,
  type GridGesture,
} from '../src/renderers-gridstack';
import {
  DRAG_IN_ATTRIBUTE,
  dragInTemplateOf,
  setupGridDragIn,
} from '../src/renderers/gridstack/grid-drag-in';
import * as ui from '../src/renderers-ui';

// Doc 189 rules 12-15 — dragging palette items into an editable grid. Real gridstack drags cannot run in jsdom
// (CLAUDE.md), so the grid's stored handlers and `acceptWidgets` are called directly, as in grid-editor.test.tsx.

const schema: JsonSchema = { type: 'object', properties: {} };

type Handler = (...args: unknown[]) => void;
/** The handlers registered with `grid.on(…)` — gridstack keeps them on an internal field. */
const handlers = (grid: GridStack | undefined) =>
  // eslint-disable-next-line no-underscore-dangle -- gridstack's own internal field; no public accessor
  (grid as unknown as { _gsEventHandler: Record<string, Handler | undefined> })._gsEventHandler;

interface FakeEditor extends GridEditor {
  gestures: GridGesture[];
}

function fakeEditor(): FakeEditor {
  const ids = new WeakMap<object, string>();
  let next = 0;
  const gestures: GridGesture[] = [];
  return {
    gestures,
    idOf: (element) => {
      if (!ids.has(element)) ids.set(element, `e${++next}`);
      return ids.get(element) as string;
    },
    onGesture: (gesture) => {
      gestures.push(gesture);
    },
  };
}

async function renderGrid(uischema: object, editor: GridEditor) {
  const set = createGridRenderers({ gridOptions: { staticGrid: false } });
  const view = render(
    <GridEditorProvider value={editor}>
      <JsonForms
        schema={schema}
        uischema={uischema as UISchemaElement}
        data={{}}
        renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
        cells={[]}
      />
    </GridEditorProvider>,
  );
  await screen.findAllByRole('heading');
  await act(async () => {});
  return view;
}

const firstRoot = (container: HTMLElement) =>
  container.querySelector<GridHTMLElement>('.grid-stack') ?? undefined;

const dragInSource = () => {
  const source = document.createElement('div');
  source.setAttribute(DRAG_IN_ATTRIBUTE, '');
  return source;
};

describe('setupGridDragIn (rule 12)', () => {
  it('marks the element and registers it as a drag-in source carrying its template, until cleaned up', () => {
    const element = document.createElement('div');
    document.body.append(element);

    const cleanup = setupGridDragIn(element, 'text');
    expect(element).toHaveAttribute(DRAG_IN_ATTRIBUTE);
    expect(GridStack.getDD().isDraggable(element)).toBe(true);
    // h: 4 so gridstack's margin-inset drop placeholder is visible (bug B1).
    expect((element as unknown as { gridstackNode?: object }).gridstackNode).toEqual({
      w: 12,
      h: 4,
      dragInTemplate: 'text',
    });

    cleanup();
    expect(element).not.toHaveAttribute(DRAG_IN_ATTRIBUTE);
    expect(GridStack.getDD().isDraggable(element)).toBe(false);
    element.remove();
  });
});

describe('dragInTemplateOf (rule 12)', () => {
  it('reads a non-empty string template and nothing else', () => {
    expect(dragInTemplateOf({ dragInTemplate: 'text' })).toBe('text');
    for (const node of [undefined, null, {}, { dragInTemplate: '' }, { dragInTemplate: 5 }]) {
      expect(dragInTemplateOf(node), JSON.stringify(node)).toBeUndefined();
    }
  });
});

describe('accepting drag-in sources (rule 13)', () => {
  it('accepts an element carrying the drag-in attribute, and still refuses anything else', async () => {
    const { container } = await renderGrid(
      { type: 'Grid', elements: [{ type: 'Heading', text: 'One' }] },
      fakeEditor(),
    );
    const accept = firstRoot(container)?.gridstack?.opts.acceptWidgets as (el: Element) => boolean;
    expect(accept(dragInSource())).toBe(true);
    expect(accept(document.createElement('div'))).toBe(false);
  });

  it('refuses a drag-in source while a HorizontalLayout is full', async () => {
    const { container } = await renderGrid(
      {
        type: 'HorizontalLayout',
        options: { columns: 2 },
        elements: [{ type: 'Heading', text: 'Wide', options: { gridItem: { w: 2 } } }],
      },
      fakeEditor(),
    );
    const accept = firstRoot(container)?.gridstack?.opts.acceptWidgets as (el: Element) => boolean;
    expect(accept(dragInSource())).toBe(false);
  });
});

describe('dropping a drag-in source (rules 14-15)', () => {
  async function renderTwoHeadings() {
    const editor = fakeEditor();
    const one = { type: 'Heading', text: 'One' };
    const two = { type: 'Heading', text: 'Two' };
    const uischema = { type: 'Grid', elements: [one, two] };
    const { container } = await renderGrid(uischema, editor);
    const grid = firstRoot(container)?.gridstack as GridStack;
    const removeWidget = vi.spyOn(grid, 'removeWidget').mockImplementation(() => grid);
    return { editor, one, two, uischema, grid, removeWidget };
  }

  it('removes gridstack’s widget and reports an insert with the drop placement and the other nodes', async () => {
    const { editor, one, two, uischema, grid, removeWidget } = await renderTwoHeadings();
    const landed = grid.engine.nodes.find((node) => node.id === editor.idOf(two)) as GridStackNode;
    Object.assign(landed, { dragInTemplate: 'text' });

    handlers(grid)['dropped']?.(new Event('dropped'), undefined, landed);

    expect(removeWidget).toHaveBeenCalledWith(landed.el, true, false);
    expect(editor.gestures).toEqual([
      {
        type: 'insert',
        template: 'text',
        gridId: editor.idOf(uischema),
        placement: { x: landed.x ?? 0, y: landed.y ?? 0, w: landed.w ?? 1 },
        nodes: [expect.objectContaining({ id: editor.idOf(one) })],
      },
    ]);
  });

  it('removes a widget dropped from outside any grid without a template, reporting nothing', async () => {
    const { editor, grid, removeWidget } = await renderTwoHeadings();
    const stray = { x: 0, y: 9, w: 12, el: document.createElement('div') } as GridStackNode;

    handlers(grid)['dropped']?.(new Event('dropped'), undefined, stray);

    expect(removeWidget).toHaveBeenCalledWith(stray.el, true, false);
    expect(editor.gestures).toEqual([]);
  });
});
