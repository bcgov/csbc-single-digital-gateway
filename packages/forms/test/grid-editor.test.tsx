import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import type { GridHTMLElement, GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { describe, expect, it, vi } from 'vitest';
import {
  createGridRenderers,
  GridEditorProvider,
  type GridEditor,
  type GridGesture,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';

// Doc 183 rules 7-10, 14-15, 18 — the gridstack editor port.

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

async function renderGrid(uischema: object, editor?: GridEditor) {
  const set = createGridRenderers({ gridOptions: { staticGrid: false } });
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
      cells={[]}
    />
  );
  const view = render(
    editor ? <GridEditorProvider value={editor}>{form}</GridEditorProvider> : form,
  );
  await screen.findAllByRole('heading');
  await act(async () => {});
  return view;
}

const roots = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<GridHTMLElement>('.grid-stack'));
const itemsOf = (root: GridHTMLElement | undefined) =>
  Array.from(root?.querySelectorAll<GridItemHTMLElement>(':scope > .grid-stack-item') ?? []);

describe('without an editor (fillable forms)', () => {
  it('keeps index-derived ids, sets no acceptWidgets and registers no gesture listeners', async () => {
    const one = { type: 'Heading', text: 'One' };
    const two = { type: 'Heading', text: 'Two' };
    const { container } = await renderGrid({ type: 'Grid', elements: [one, two] });
    const [root] = roots(container);

    expect(itemsOf(root).map((item) => item.getAttribute('gs-id')?.slice(-2))).toEqual([
      '-0',
      '-1',
    ]);
    expect(root?.gridstack?.opts.acceptWidgets).toBeFalsy();
    expect(handlers(root?.gridstack)['dragstop']).toBeUndefined();
    expect(handlers(root?.gridstack)['dropped']).toBeUndefined();
  });

  it('renders each item from its elementId', async () => {
    const { container } = await renderGrid({
      type: 'Grid',
      elements: [
        { type: 'Heading', text: 'One' },
        { type: 'Heading', text: 'Two' },
      ],
    });
    const [first, second] = itemsOf(roots(container)[0]);
    expect(first).toHaveTextContent('One');
    expect(second).toHaveTextContent('Two');
  });
});

describe('with an editor (studio)', () => {
  it('takes widget ids from editor.idOf and renders each item’s own element', async () => {
    const editor = fakeEditor();
    const one = { type: 'Heading', text: 'One' };
    const two = { type: 'Heading', text: 'Two' };
    const { container } = await renderGrid({ type: 'Grid', elements: [one, two] }, editor);
    const items = itemsOf(roots(container)[0]);

    const itemFor = (element: UISchemaElement) =>
      items.find((item) => item.getAttribute('gs-id') === editor.idOf(element));
    expect(itemFor(one)).toHaveTextContent('One');
    expect(itemFor(two)).toHaveTextContent('Two');
  });

  it('accepts grid items but refuses one that contains the grid', async () => {
    const editor = fakeEditor();
    const { container } = await renderGrid(
      {
        type: 'Grid',
        elements: [
          { type: 'Heading', text: 'Sibling' },
          { type: 'Grid', elements: [{ type: 'Heading', text: 'Inner' }] },
        ],
      },
      editor,
    );
    const [outer, inner] = roots(container);
    const accept = inner?.gridstack?.opts.acceptWidgets;
    expect(typeof accept).toBe('function');

    const [sibling, holder] = itemsOf(outer);
    const check = accept as (el: Element) => boolean;
    expect(check(sibling as Element)).toBe(true);
    expect(check(holder as Element)).toBe(false);
    expect(check(document.createElement('div'))).toBe(false);
  });

  it.each(['dragstop', 'resizestop'])(
    'reports a layout gesture with every node of the grid on %s',
    async (type) => {
      const editor = fakeEditor();
      const one = { type: 'Heading', text: 'One' };
      const two = { type: 'Heading', text: 'Two' };
      const uischema = { type: 'Grid', elements: [one, two] };
      const { container } = await renderGrid(uischema, editor);
      const [root] = roots(container);
      const [first] = itemsOf(root);

      handlers(root?.gridstack)[type]?.(new Event(type), first);

      expect(editor.gestures).toHaveLength(1);
      const [gesture] = editor.gestures;
      expect(gesture).toMatchObject({ type: 'layout', gridId: editor.idOf(uischema) });
      expect(gesture?.type === 'layout' && gesture.nodes.map((n) => n.id).toSorted()).toEqual(
        [editor.idOf(one), editor.idOf(two)].toSorted(),
      );
      expect(gesture?.type === 'layout' && gesture.nodes[0]).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          w: expect.any(Number),
        }),
      );
    },
  );

  it('ignores a dragstop for an item that is no longer in the grid', async () => {
    const editor = fakeEditor();
    const { container } = await renderGrid(
      {
        type: 'Grid',
        elements: [{ type: 'Grid', elements: [{ type: 'Heading', text: 'Inner' }] }],
      },
      editor,
    );
    const [outer, inner] = roots(container);
    const [innerItem] = itemsOf(inner);

    handlers(outer?.gridstack)['dragstop']?.(new Event('dragstop'), innerItem);

    expect(editor.gestures).toHaveLength(0);
  });

  it('on a drop from another grid, removes the moved node and reports a move', async () => {
    const editor = fakeEditor();
    const moved = { type: 'Heading', text: 'Moved' };
    const innerUischema = { type: 'Grid', elements: [{ type: 'Heading', text: 'Inner' }] };
    const uischema = { type: 'Grid', elements: [moved, innerUischema] };
    const { container } = await renderGrid(uischema, editor);
    const [outer, inner] = roots(container);
    const innerGrid = inner?.gridstack as GridStack;
    const outerGrid = outer?.gridstack as GridStack;
    const removeWidget = vi.spyOn(innerGrid, 'removeWidget').mockImplementation(() => innerGrid);
    const [landed] = itemsOf(inner);

    const previousNode = { id: editor.idOf(moved), grid: outerGrid } as GridStackNode;
    const newNode = {
      id: editor.idOf(moved),
      grid: innerGrid,
      el: landed,
      x: 0,
      y: 3,
      w: 6,
    } as GridStackNode;
    handlers(innerGrid)['dropped']?.(new Event('dropped'), previousNode, newNode);

    expect(removeWidget).toHaveBeenCalledWith(landed, true, false);
    expect(editor.gestures).toContainEqual(
      expect.objectContaining({
        type: 'move',
        elementId: editor.idOf(moved),
        fromGridId: editor.idOf(uischema),
        toGridId: editor.idOf(innerUischema),
      }),
    );
  });
});
