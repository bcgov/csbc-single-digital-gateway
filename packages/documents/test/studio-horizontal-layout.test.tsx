import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import type { GridStackNode } from 'gridstack';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import { studioHorizontalLayoutEntry } from '../src/renderers/studio/studio-horizontal-layout';
import type { Governance } from '../src/studio/capabilities/governance';
import { changeEvent, handlersOf, type Grid } from './grid-move';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const form = (elements: unknown[]) => ({ id: 'form', type: 'Form', label: 'Page', elements });
const sized = (id: string, w?: number) =>
  studioHeading(id, id.toUpperCase(), w === undefined ? {} : { gridItem: { w } });
const row = (elements: unknown[], options: Record<string, unknown> = { justify: 'start' }) => ({
  id: 'r',
  type: 'HorizontalLayout',
  options,
  elements,
});
const rowOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="studio-row"]') as Grid;
const itemsOf = (grid: Grid) => [
  ...grid.querySelectorAll<HTMLElement>(':scope > .grid-stack-item'),
];
const nodeOf = (item: HTMLElement) =>
  (item as HTMLElement & { gridstackNode?: GridStackNode }).gridstackNode;

const governance = (overrides: Partial<Governance>): Governance =>
  new Proxy(overrides, {
    get: (target, key: string) =>
      (target as Record<string, unknown>)[key] ?? (key === 'restrictions' ? () => [] : () => true),
  }) as Governance;

/** What gridstack hands `dropped` for an arrival at column `x`: its clone, the row's others where it repacked them. */
function dropAt(target: Grid, el: HTMLElement, x: number, previous?: unknown) {
  el.classList.add('grid-stack-item');
  el.innerHTML = '<div class="grid-stack-item-content"><div>clone</div></div>';
  target.appendChild(el);
  const node = target.gridstack.makeWidget(el, { x, y: 0, w: 1, h: 1 }).gridstackNode;
  act(() => {
    handlersOf(target)['dropped']!(new Event('dropped'), previous, node as GridStackNode);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('studio HorizontalLayout renderer (doc 261 rules 7-16)', () => {
  describe('rendering', () => {
    it('renders one gridstack row of N columns with items at their display placement', () => {
      const { container } = renderStudioRenderers(
        form([row([sized('a', 2), sized('b', 3)], { columns: 6, justify: 'end' })]),
      );
      const g = rowOf(container);
      expect(g.gridstack.getColumn()).toBe(6);
      expect(g.gridstack.opts.maxRow).toBe(1);
      expect(itemsOf(g).map((i) => [nodeOf(i)?.x, nodeOf(i)?.w, nodeOf(i)?.y])).toEqual([
        [1, 2, 0],
        [3, 3, 0],
      ]);
    });

    it('outranks the default HorizontalLayout at rank 2', () => {
      expect(
        studioHorizontalLayoutEntry.tester({ type: 'HorizontalLayout' } as never, {}, {} as never),
      ).toBe(2);
    });

    it('resizes from the left and right edges only', () => {
      const { container } = renderStudioRenderers(form([row([sized('a', 2)])]));
      const handles = [
        ...itemsOf(rowOf(container))[0]!.querySelectorAll(':scope > .ui-resizable-handle'),
      ].map((h) => [...h.classList].find((name) => /^ui-resizable-[a-z]{1,2}$/.test(name)));
      expect(handles.toSorted()).toEqual(['ui-resizable-e', 'ui-resizable-w']);
    });

    it('marks a template-fixed child gs-no-move, gs-no-resize and gs-locked', () => {
      const { container } = renderStudioRenderers(form([row([sized('a'), sized('b')])]), {
        governance: governance({ canDrag: (id) => id !== 'a' }),
      });
      const [a, b] = itemsOf(rowOf(container));
      expect(a).toHaveAttribute('gs-no-move', 'true');
      expect(a).toHaveAttribute('gs-no-resize', 'true');
      expect(a).toHaveAttribute('gs-locked', 'true');
      expect(b).not.toHaveAttribute('gs-locked');
    });

    it('shows a dashed frame and Drag items here when empty', () => {
      const { container } = renderStudioRenderers(form([row([])]));
      expect(rowOf(container)).toHaveTextContent('Drag items here');
      expect(rowOf(container)).toHaveAttribute('data-empty');
    });
  });

  describe('writes', () => {
    it('writes the new order and stored widths on change', () => {
      const { container, update } = renderStudioRenderers(
        form([row([sized('a', 2), sized('b', 3)])]),
      );
      const g = rowOf(container);
      const [a, b] = g.gridstack.engine.nodes;
      // b moved to the front, a widened to 4 — as the row engine leaves them.
      Object.assign(b!, { x: 0 });
      Object.assign(a!, { x: 3, w: 4 });
      act(() => handlersOf(g)['change']!(changeEvent(g.gridstack.engine.nodes)));
      expect(update).toHaveBeenCalledTimes(1);
      const [id, patch] = update.mock.calls[0]!;
      expect(id).toBe('r');
      const written = (patch.elements as { id: string; options: { gridItem?: unknown } }[]).map(
        (e) => [e.id, e.options.gridItem],
      );
      expect(written).toEqual([
        ['b', { w: 3 }],
        ['a', { w: 4 }],
      ]);
    });

    it('hears its own change when nested (bug B1)', () => {
      const update = vi.fn<(id: string, patch: ElementPatch) => void>();
      const page = (elements: unknown[]) => (
        <StudioEditorProvider update={update} insert={vi.fn()}>
          <JsonForms
            schema={{ type: 'object' }}
            uischema={form([row(elements)]) as never}
            data={{}}
            renderers={studio.renderers}
            cells={studio.cells}
            validationMode="NoValidation"
          />
        </StudioEditorProvider>
      );
      const view = render(page([sized('a', 2)]));
      view.rerender(page([sized('a', 2), sized('b', 2)]));
      const g = rowOf(view.container);
      act(() => {
        g.gridstack.update(g.querySelector<HTMLElement>('[gs-id="a"]')!, { w: 3 });
      });
      expect(update).toHaveBeenCalled();
    });

    it('inserts a dropped palette item at the dropped index', () => {
      const { container, insert } = renderStudioRenderers(
        form([row([sized('a', 2), sized('b', 2)])]),
      );
      const g = rowOf(container);
      // The engine has repacked: a at 0, the arrival at 2, b at 3.
      Object.assign(g.gridstack.engine.nodes.find((n) => n.id === 'b')!, { x: 3 });
      const clone = document.createElement('div');
      clone.setAttribute('data-palette-item', 'separator');
      dropAt(g, clone, 2);
      expect(insert).toHaveBeenCalledWith('r', 1, 'separator');
      expect(clone.isConnected).toBe(false);
    });

    it("moves another grid's item in at the dropped index", () => {
      const { container, move } = renderStudioRenderers(
        form([
          { id: 'v', type: 'VerticalLayout', elements: [studioHeading('x', 'X')] },
          row([sized('a', 2)]),
        ]),
        { movable: true },
      );
      const source = container.querySelector(
        '[data-element-type="VerticalLayout"] [data-slot="studio-vertical-layout"]',
      ) as Grid;
      const item = document.createElement('div');
      item.setAttribute('gs-id', 'x');
      dropAt(rowOf(container), item, 0, { id: 'x', grid: source.gridstack });
      expect(move).toHaveBeenCalledWith('x', 'r', 0);
    });

    it('refuses a drop when the row has as many children as columns', () => {
      const palette = document.createElement('div');
      palette.setAttribute('data-palette-item', 'heading');
      const full = renderStudioRenderers(form([row([sized('a'), sized('b')], { columns: 2 })]));
      const accepts = rowOf(full.container).gridstack.opts.acceptWidgets as (
        el: Element,
      ) => boolean;
      expect(accepts(palette)).toBe(false);
      full.unmount();
      const roomy = renderStudioRenderers(form([row([sized('a')], { columns: 2 })]));
      const acceptsRoomy = rowOf(roomy.container).gridstack.opts.acceptWidgets as (
        el: Element,
      ) => boolean;
      expect(acceptsRoomy(palette)).toBe(true);
    });

    it('asks governance.mayDrop in the accept check', () => {
      const asked: unknown[] = [];
      const { container } = renderStudioRenderers(form([row([])]), {
        governance: governance({
          mayDrop: (layoutId, source) => {
            asked.push([layoutId, source]);
            return false;
          },
        }),
      });
      const palette = document.createElement('div');
      palette.setAttribute('data-palette-item', 'heading');
      const accepts = rowOf(container).gridstack.opts.acceptWidgets as (el: Element) => boolean;
      expect(accepts(palette)).toBe(false);
      expect(asked).toContainEqual(['r', { palette: true }]);
    });
  });
});
